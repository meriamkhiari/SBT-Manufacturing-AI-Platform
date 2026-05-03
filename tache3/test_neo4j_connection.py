"""
Test Neo4j connection with current configuration
"""
from src.config import settings
from neo4j import GraphDatabase

print("=" * 60)
print("Testing Neo4j Connection")
print("=" * 60)
print(f"URI:      {settings.neo4j_uri}")
print(f"User:     {settings.neo4j_user}")
print(f"Database: {settings.neo4j_database}")
print(f"Password: {'*' * len(settings.neo4j_password)}")
print("=" * 60)

try:
    driver = GraphDatabase.driver(
        settings.neo4j_uri,
        auth=(settings.neo4j_user, settings.neo4j_password),
    )
    
    with driver.session(database=settings.neo4j_database) as session:
        result = session.run("RETURN 1 AS test")
        value = result.single()["test"]
        print(f"✅ Connection successful! Test query returned: {value}")
        
        # Count nodes
        result = session.run("MATCH (n) RETURN count(n) AS count")
        count = result.single()["count"]
        print(f"✅ Total nodes in database: {count}")
        
        # Count companies
        result = session.run("MATCH (c:Company) RETURN count(c) AS count")
        company_count = result.single()["count"]
        print(f"✅ Company nodes: {company_count}")
    
    driver.close()
    print("=" * 60)
    print("✅ All tests passed!")
    
except Exception as e:
    print(f"❌ Connection failed: {e}")
    print(f"❌ Error type: {type(e).__name__}")
    import traceback
    traceback.print_exc()
