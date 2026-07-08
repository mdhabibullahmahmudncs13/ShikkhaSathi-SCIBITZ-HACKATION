import asyncio
import sys
sys.path.insert(0, 'backend')

from app.services.rag.rag_service import get_rag_service

async def test_rag():
    print("\n" + "="*60)
    print("Testing RAG System Status")
    print("="*60 + "\n")
    
    rag = get_rag_service()
    
    if rag is None:
        print("❌ RAG service failed to initialize")
        return
    
    # Get stats
    stats = rag.get_collection_stats()
    print(f"📊 Collection Stats:")
    print(f"   Collection Name: {stats.get('collection_name', 'unknown')}")
    print(f"   Document Count: {stats.get('document_count', 0)}")
    
    if stats.get('document_count', 0) == 0:
        print("\n⚠️  No documents in collection. Need to reload.")
        return
    
    # Test search
    print(f"\n{'='*60}")
    print("Testing Search Functionality")
    print(f"{'='*60}\n")
    
    test_queries = [
        ("What is photosynthesis?", None),
        ("Explain quadratic formula", "Mathematics"),
        ("বাংলা ব্যাকরণ কি?", "Bangla")
    ]
    
    for query, subject_filter in test_queries:
        print(f"Query: {query}")
        if subject_filter:
            print(f"Subject Filter: {subject_filter}")
        
        results = await rag.search_similar(
            query=query,
            n_results=2,
            subject_filter=subject_filter
        )
        
        if results:
            print(f"✅ Found {len(results)} results")
            for i, result in enumerate(results, 1):
                print(f"  {i}. Subject: {result['metadata'].get('subject', 'Unknown')}")
                print(f"     Distance: {result.get('distance', 'N/A'):.4f}")
                print(f"     Content: {result['content'][:100]}...")
        else:
            print("❌ No results found")
        print()
    
    print("="*60)
    print("Test Complete!")
    print("="*60 + "\n")

if __name__ == "__main__":
    asyncio.run(test_rag())
