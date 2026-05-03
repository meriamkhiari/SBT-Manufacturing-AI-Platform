#!/usr/bin/env python3
"""
Diagnostic script to analyze failed pipeline records in MongoDB.
Helps identify patterns in failures and provides actionable insights.
"""

import os
from pymongo import MongoClient
from dotenv import load_dotenv
from datetime import datetime, timedelta
from collections import Counter

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB = os.getenv("MONGO_DB", "cable_db")
MONGO_COLL = os.getenv("MONGO_COLL", "terminals")


def analyze_failures():
    """Analyze failed pipeline records and provide diagnostic information."""
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    
    try:
        db = client[MONGO_DB]
        collection = db[MONGO_COLL]
        
        print("=" * 70)
        print("PIPELINE FAILURE ANALYSIS")
        print("=" * 70)
        print()
        
        # Get all failed records
        failed_records = list(collection.find({"pipeline_status": "failed"}))
        total_records = collection.count_documents({})
        success_records = collection.count_documents({"pipeline_status": "success"})
        
        print(f"Total Records:   {total_records}")
        print(f"Success:         {success_records} ({success_records/total_records*100:.1f}%)")
        print(f"Failed:          {len(failed_records)} ({len(failed_records)/total_records*100:.1f}%)")
        print()
        
        if not failed_records:
            print("✓ No failed records found!")
            return
        
        # Analyze error types
        print("-" * 70)
        print("ERROR BREAKDOWN")
        print("-" * 70)
        error_types = Counter(r.get("validation_error", "Unknown") for r in failed_records)
        for error, count in error_types.most_common():
            print(f"  {count:3d}x  {error}")
        print()
        
        # Analyze by reference
        print("-" * 70)
        print("FAILED REFERENCES")
        print("-" * 70)
        references = Counter(r.get("reference", "unknown") for r in failed_records)
        for ref, count in references.most_common(10):
            print(f"  {count:3d}x  {ref}")
        print()
        
        # Recent failures
        print("-" * 70)
        print("RECENT FAILURES (Last 10)")
        print("-" * 70)
        recent = sorted(failed_records, key=lambda x: x.get("created_at", ""), reverse=True)[:10]
        for i, record in enumerate(recent, 1):
            created = record.get("created_at", "unknown")
            ref = record.get("reference", "unknown")
            error = record.get("validation_error", "Unknown error")
            print(f"{i:2d}. {created[:19]} | {ref:20s} | {error}")
        print()
        
        # Recommendations
        print("-" * 70)
        print("RECOMMENDATIONS")
        print("-" * 70)
        
        no_terminal_count = sum(1 for r in failed_records 
                               if "No terminal blocks detected" in r.get("validation_error", ""))
        
        if no_terminal_count > 0:
            print(f"⚠ {no_terminal_count} failures due to 'No terminal blocks detected'")
            print("  Possible causes:")
            print("    - Poor image quality (blurry, dark, or low resolution)")
            print("    - Wrong image type (diagrams, schematics, or non-terminal images)")
            print("    - Gemini Vision model sensitivity")
            print("  Actions:")
            print("    - Review the images that failed (check user_history collection)")
            print("    - Consider adjusting the vision prompt in detectAgent.py")
            print("    - Implement image quality pre-checks before pipeline")
            print()
        
        invalid_ref_count = sum(1 for r in failed_records 
                               if "reference" in r.get("validation_error", "").lower())
        
        if invalid_ref_count > 0:
            print(f"⚠ {invalid_ref_count} failures due to invalid/missing reference")
            print("  Actions:")
            print("    - Check extractReference.py OCR accuracy")
            print("    - Review reference extraction prompt")
            print("    - Consider manual reference entry fallback")
            print()
        
        # Check for patterns in time
        if len(failed_records) >= 5:
            recent_24h = sum(1 for r in failed_records 
                           if (datetime.utcnow() - datetime.fromisoformat(r.get("created_at", "2000-01-01").replace("Z", ""))) < timedelta(hours=24))
            if recent_24h > len(failed_records) * 0.5:
                print(f"⚠ {recent_24h} failures in last 24 hours (spike detected)")
                print("  This might indicate a recent issue with:")
                print("    - API rate limits or service degradation")
                print("    - Recent code changes")
                print("    - Batch of problematic images")
                print()
        
        print("-" * 70)
        print()
        
    except Exception as e:
        print(f"Error connecting to MongoDB: {e}")
        print(f"Connection string: {MONGO_URI}")
        print(f"Database: {MONGO_DB}")
        print(f"Collection: {MONGO_COLL}")
    
    finally:
        client.close()


if __name__ == "__main__":
    analyze_failures()
