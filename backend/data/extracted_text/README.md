# 📄 Extracted Text Storage

This directory contains text files extracted from PDF documents during the RAG pipeline processing.

## 📁 Directory Structure

```
backend/data/extracted_text/
├── README.md                    # This file
├── pages/                       # Individual page text files
│   ├── {filename}_page_{n}.txt  # Text from specific pages
│   └── metadata/                # Page metadata files
├── chunks/                      # Chunked text files
│   ├── {filename}_chunk_{n}.txt # Individual text chunks
│   └── metadata/                # Chunk metadata files
├── full_documents/              # Complete document text
│   ├── {filename}_full.txt      # Full document text
│   └── metadata/                # Document metadata files
└── processing_logs/             # Processing logs and statistics
    ├── {filename}_log.txt       # Processing log for each document
    └── extraction_stats.json    # Overall extraction statistics
```

## 📝 File Naming Convention

### Page Files:
- `physics_grade_9_page_001.txt` - Page 1 from physics_grade_9.pdf
- `mathematics_grade_10_page_045.txt` - Page 45 from mathematics textbook

### Chunk Files:
- `physics_grade_9_chunk_001.txt` - First chunk from physics textbook
- `physics_grade_9_chunk_002.txt` - Second chunk from physics textbook

### Full Document Files:
- `physics_grade_9_full.txt` - Complete text from physics textbook
- `bangla_literature_grade_8_full.txt` - Complete Bangla literature text

## 🔍 Usage

These text files are useful for:
- **Debugging**: Review extraction quality
- **Manual Review**: Check if text extraction is accurate
- **Preprocessing**: Apply additional text cleaning if needed
- **Backup**: Keep extracted text for reprocessing
- **Analysis**: Analyze content structure and quality

## 🧹 Maintenance

- Files are automatically created during document processing
- Old files are kept for reference (manual cleanup needed)
- Large files (>10MB) should be compressed or archived
- Regular cleanup recommended to save disk space