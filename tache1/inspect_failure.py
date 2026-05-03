#!/usr/bin/env python3
"""
Inspect a specific failed record by its MongoDB _id.
Provides detailed information to help diagnose the issue.
"""

import os
import sys
from pymongo import MongoClient
from bson.objectid import ObjectId
from dotenv import load_dotenv
import json

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB = os.getenv("MONGO_DB", "cable_db")
MONGO_COLL = os.getenv("MONGO_COLL", "terminals")


def inspect_record(record_id: str):
    """Inspect a specific failed record by its _id."""
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    
    try:
        db = client[MONGO_DB]
        collection = db[MONGO_COLL]
        
        # Convert string ID to ObjectId
        try:
            obj_id = ObjectId(record_id)
        except Exception as e:
            print(f"Error: Invalid ObjectId format: {record_id}")
            print(f"Details: {e}")
            return
        
        # Find the record
        record = collection.find_one({"_id": obj_id})
        
        if not record:
            print(f"Error: No record found with _id: {record_id}")
            return
        
        print("=" * 70)
        print(f"RECORD INSPECTION: {record_id}")
        print("=" * 70)
        print()
        
        # Basic info
        print("BASIC INFORMATION")
        print("-" * 70)
        print(f"Status:      {record.get('pipeline_status', 'unknown')}")
        print(f"Reference:   {record.get('reference', 'unknown')}")
        print(f"Created:     {record.get('created_at', 'unknown')}")
        print(f"Source:      {record.get('source', 'unknown')}")
        print(f"Version:     {record.get('version', 'unknown')}")
        print()
        
        # Error details
        if record.get("validation_error"):
            print("ERROR DETAILS")
            print("-" * 70)
            print(f"Error: {record['validation_error']}")
            print()
        
        # Terminal data
        print("TERMINAL DATA")
        print("-" * 70)
        terminals = record.get("terminals", record.get("raw_terminals", []))
        if terminals:
            print(f"Terminals detected: {len(terminals)}")
            for i, terminal in enumerate(terminals, 1):
                print(f"\n  Terminal {i}:")
                print(f"    Image number: {terminal.get('image_number', '?')}")
                print(f"    Description:  {terminal.get('description', 'N/A')}")
                ports = terminal.get('ports', [])
                print(f"    Ports:        {len(ports)}")
                if ports:
                    for port in ports:
                        print(f"      Port {port.get('port', '?'):2d}: {port.get('color', 'unknown')}")
        else:
            print("No terminals detected")
        print()
        
        # Corrections
        corrections = record.get("corrections", record.get("corrections_attempted", []))
        if corrections:
            print("CORRECTIONS ATTEMPTED")
            print("-" * 70)
            for i, correction in enumerate(corrections, 1):
                print(f"  {i}. {correction}")
            print()
        
        # Full JSON
        print("FULL RECORD (JSON)")
        print("-" * 70)
        # Convert ObjectId to string for JSON serialization
        record_copy = record.copy()
        record_copy['_id'] = str(record_copy['_id'])
        print(json.dumps(record_copy, indent=2, default=str))
        print()
        
        # Recommendations
        print("=" * 70)
        print("DIAGNOSTIC RECOMMENDATIONS")
        print("=" * 70)
        
        if record.get("validation_error") == "No terminal blocks detected in the input.":
            print("⚠ Issue: Vision model failed to detect terminal blocks")
            print()
            print("Possible causes:")
            print("  1. Image quality issues:")
            print("     - Blurry or out-of-focus image")
            print("     - Poor lighting (too dark or overexposed)")
            print("     - Low resolution")
            print("  2. Wrong image type:")
            print("     - Diagram or schematic instead of photo")
            print("     - Non-terminal connector type")
            print("     - Image doesn't contain a terminal block")
            print("  3. Model sensitivity:")
            print("     - Gemini Vision model being too conservative")
            print("     - Prompt not matching the image characteristics")
            print()
            print("Next steps:")
            print("  1. Check user_history collection for the original image")
            print("  2. Manually verify if a terminal block is visible")
            print("  3. If visible, consider adjusting detectAgent.py prompt")
            print("  4. If not visible, improve image quality requirements")
            print()
        
        elif "reference" in record.get("validation_error", "").lower():
            print("⚠ Issue: Reference extraction failed")
            print()
            print("Next steps:")
            print("  1. Check if reference label was visible in image")
            print("  2. Review extractReference.py OCR logic")
            print("  3. Consider manual reference entry option")
            print()
        
        print("=" * 70)
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        client.close()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python inspect_failure.py <mongodb_object_id>")
        print()
        print("Example:")
        print("  python inspect_failure.py 69f5eb45e78f70aeccd31a12")
        print()
        print("To find failed record IDs, run: python diagnose_failures.py")
        sys.exit(1)
    
    record_id = sys.argv[1]
    inspect_record(record_id)
