"""Generic reverse-proxy helper used by every task blueprint."""
from urllib.parse import urljoin

import requests
from flask import Response, request


HOP_BY_HOP = {
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailers",
    "transfer-encoding",
    "upgrade",
    "content-encoding",
    "content-length",
}


def proxy(target_base: str, subpath: str) -> Response:
    """Forward the current Flask request to `target_base/subpath`."""
    url = urljoin(target_base.rstrip("/") + "/", subpath.lstrip("/"))

    fwd_headers = {k: v for k, v in request.headers if k.lower() != "host"}

    try:
        upstream = requests.request(
            method=request.method,
            url=url,
            headers=fwd_headers,
            params=request.args,
            data=request.get_data(),
            cookies=request.cookies,
            allow_redirects=False,
            timeout=30,
            stream=True,
        )
    except requests.exceptions.ConnectionError:
        return Response(
            response=f'{{"error":"upstream offline","target":"{url}"}}',
            status=502,
            mimetype="application/json",
        )
    except requests.exceptions.Timeout:
        return Response(
            response=f'{{"error":"upstream timeout","target":"{url}"}}',
            status=504,
            mimetype="application/json",
        )

    response_headers = [
        (name, value)
        for name, value in upstream.raw.headers.items()
        if name.lower() not in HOP_BY_HOP
    ]
    return Response(upstream.iter_content(chunk_size=8192),
                    status=upstream.status_code,
                    headers=response_headers)
