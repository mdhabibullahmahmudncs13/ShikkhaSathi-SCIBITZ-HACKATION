"""
NCTB Textbook Content Ingestion Service
Processes actual NCTB textbook files and structures them for the learning system
"""

import os
import re
from typing import List, Dict, Any, Optional, Tuple
from pathlib import Path
import logging
from dataclasses import dataclass

logger = logging.getLogger(__name__)

@dataclass
class Chapter:
    number: int
    title: str
    content: str
    page_start: int
    page_end: int
    topics: List[str]

@dataclass
class TextbookContent:
    subject: str
    grade: str
    chapters: List[Chapter]
    total_pages: int
    metadata: Dict[str, Any]

class NCTBContentIngestionService:
    """Service to ingest and structure NCTB textbook content"""
    
    def __init__(self, data_path: str = "data/nctb_txt"):
        self.data_path = Path(data_path)
        self.textbooks = {}
        
    def get_available_textbooks(self) -> List[str]:
        """Get list of available textbook files"""
        if not self.data_path.exists():
            logger.error(f"Data path {self.data_path} does not exist")
            return []
            
        textbook_files = []
        for file_path in self.data_path.glob("*.txt"):
            textbook_files.append(file_path.name)
        
        return textbook_files
    
    def parse_textbook_file(self, filename: str) -> Optional[TextbookContent]:
        """Parse a single textbook file and extract structured content"""
        file_path = self.data_path / filename
        
        if not file_path.exists():
            logger.error(f"Textbook file {filename} not found")
            return None
            
        try:
            # Store current filename for use in chapter parsing
            self._current_filename = filename
            
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Extract metadata from filename
            subject, grade = self._extract_metadata_from_filename(filename)
            
            # Parse chapters
            chapters = self._parse_chapters(content)
            
            # Count total pages
            total_pages = self._count_pages(content)
            
            textbook = TextbookContent(
                subject=subject,
                grade=grade,
                chapters=chapters,
                total_pages=total_pages,
                metadata={
                    'filename': filename,
                    'source': 'NCTB',
                    'language': 'English' if 'English' in filename else 'Bangla',
                    'year': '2025'  # Based on the revised edition
                }
            )
            
            logger.info(f"Successfully parsed {filename}: {len(chapters)} chapters, {total_pages} pages")
            return textbook
            
        except Exception as e:
            logger.error(f"Error parsing textbook {filename}: {str(e)}")
            return None
    
    def _extract_metadata_from_filename(self, filename: str) -> Tuple[str, str]:
        """Extract subject and grade from filename"""
        filename_lower = filename.lower()
        
        # Extract subject
        if 'math' in filename_lower:
            subject = 'Mathematics'
        elif 'physics' in filename_lower:
            subject = 'Physics'
        elif 'english' in filename_lower:
            subject = 'English'
        elif 'bangla' in filename_lower or 'বাংলা' in filename:
            subject = 'Bangla'
        elif 'ict' in filename_lower:
            subject = 'ICT'
        else:
            subject = 'General'
        
        # Extract grade (most files are for 9-10)
        if '9-10' in filename:
            grade = '9-10'
        elif '9' in filename and '10' in filename:
            grade = '9-10'
        else:
            grade = '9-10'  # Default assumption
            
        return subject, grade
    
    def _get_predefined_chapters(self, subject: str) -> List[Dict[str, Any]]:
        """Get predefined chapter structure for known textbooks"""
        
        if subject.lower() == 'mathematics':
            return [
                {'number': 1, 'title': 'Real Numbers'},
                {'number': 2, 'title': 'Sets and Functions'},
                {'number': 3, 'title': 'Algebraic Expressions'},
                {'number': 4, 'title': 'Exponents and Logarithms'},
                {'number': 5, 'title': 'Equations in One Variable'},
                {'number': 6, 'title': 'Lines, Angles and Triangles'},
                {'number': 7, 'title': 'Practical Geometry'},
                {'number': 8, 'title': 'Circle'},
                {'number': 9, 'title': 'Trigonometric Ratio'},
                {'number': 10, 'title': 'Distance and Elevation'},
                {'number': 11, 'title': 'Algebraic Ratio and Proportion'},
                {'number': 12, 'title': 'Simple Simultaneous Equations in Two Variables'},
                {'number': 13, 'title': 'Finite Series'},
                {'number': 14, 'title': 'Ratio, Similarity and Symmetry'},
                {'number': 15, 'title': 'Area Related Theorems and Constructions'},
            ]
        elif subject.lower() == 'physics':
            return [
                {'number': 1, 'title': 'Physical World and Measurement'},
                {'number': 2, 'title': 'Motion'},
                {'number': 3, 'title': 'Force and Motion'},
                {'number': 4, 'title': 'Work, Energy and Power'},
                {'number': 5, 'title': 'Matter and Molecular Motion'},
            ]
        elif subject.lower() == 'bangla':
            return [
                {'number': 1, 'title': 'গদ্য অংশ'},
                {'number': 2, 'title': 'পদ্য অংশ'},
                {'number': 3, 'title': 'নাটক'},
                {'number': 4, 'title': 'প্রবন্ধ'},
                {'number': 5, 'title': 'ব্যাকরণ'},
            ]
        
        return []

    def _parse_chapters(self, content: str) -> List[Chapter]:
        """Parse chapters from textbook content"""
        chapters = []
        
        # First, try to get predefined chapter structure
        # Extract subject from the content or use a more reliable method
        subject = self._extract_metadata_from_filename(getattr(self, '_current_filename', 'math.txt'))[0]
        predefined_chapters = self._get_predefined_chapters(subject)
        
        if predefined_chapters:
            # Use predefined structure and try to find content for each chapter
            for chapter_info in predefined_chapters:
                chapter_num = chapter_info['number']
                chapter_title = chapter_info['title']
                
                # Try to find chapter content in the text
                title_patterns = [
                    rf'Chapter\s+{chapter_num}\s*\n\s*{re.escape(chapter_title)}',
                    rf'{re.escape(chapter_title)}.*?(?=Chapter\s+\d+|$)',
                    rf'{re.escape(chapter_title)}.*?(?=^\d+\s+[A-Za-z]|$)',
                ]
                
                chapter_content = ""
                for pattern in title_patterns:
                    match = re.search(pattern, content, re.DOTALL | re.IGNORECASE | re.MULTILINE)
                    if match:
                        chapter_content = match.group(0)
                        break
                
                # If no specific content found, create a meaningful placeholder
                if not chapter_content or len(chapter_content) < 100:
                    chapter_content = f"Chapter {chapter_num}: {chapter_title}\n\nThis chapter covers the fundamental concepts of {chapter_title.lower()}. Students will learn key principles and applications in this area of study."
                
                # Extract topics from chapter content
                topics = self._extract_topics_from_chapter(chapter_content)
                
                # If no topics found, create some based on chapter title
                if not topics:
                    topics = self._generate_default_topics(chapter_title)
                
                # Find page numbers
                page_start, page_end = self._find_page_range(chapter_content)
                
                chapter = Chapter(
                    number=chapter_num,
                    title=chapter_title,
                    content=chapter_content,
                    page_start=page_start,
                    page_end=page_end,
                    topics=topics
                )
                
                chapters.append(chapter)
            
            return chapters
        
        # Fallback to original parsing logic
        # Find chapter boundaries - improved pattern to match actual textbook format
        # Look for "Chapter X" followed by chapter title on next line
        chapter_pattern = r'Chapter\s+(\d+)\s*\n\s*([^\n]+)'
        chapter_matches = list(re.finditer(chapter_pattern, content, re.IGNORECASE | re.MULTILINE))
        
        # If no "Chapter X" pattern found, try table of contents pattern
        if not chapter_matches:
            # Look for numbered entries in table of contents like "1 Real Numbers 1"
            # More flexible pattern to catch all chapter entries
            toc_pattern = r'^(\d+)\s+([A-Za-z][^0-9\n]*?)\s+\d+\s*$'
            toc_matches = list(re.finditer(toc_pattern, content, re.MULTILINE))
            
            # If still no matches, try a simpler pattern
            if not toc_matches:
                toc_pattern = r'^(\d+)\s+([A-Za-z][^\n]*?)\s*$'
                toc_matches = list(re.finditer(toc_pattern, content, re.MULTILINE))
            
            # Convert TOC matches to chapter-like structure
            for match in toc_matches:
                chapter_num = int(match.group(1))
                chapter_title = match.group(2).strip()
                
                # Clean up chapter title (remove page numbers at the end)
                chapter_title = re.sub(r'\s+\d+\s*$', '', chapter_title).strip()
                
                # Skip if title is too short or looks like a page number
                if len(chapter_title) < 3 or chapter_title.isdigit():
                    continue
                
                # Find the actual chapter content by looking for the title in the text
                title_pattern = re.escape(chapter_title)
                content_match = re.search(rf'{title_pattern}.*?(?=^\d+\s+[A-Za-z]|$)', content, re.DOTALL | re.IGNORECASE | re.MULTILINE)
                
                if content_match:
                    chapter_content = content_match.group(0)
                else:
                    # Fallback: create a section based on position
                    chapter_content = f"Chapter {chapter_num}: {chapter_title}\n\nContent for {chapter_title} chapter."
                
                # Extract topics from chapter content
                topics = self._extract_topics_from_chapter(chapter_content)
                
                # Find page numbers
                page_start, page_end = self._find_page_range(chapter_content)
                
                chapter = Chapter(
                    number=chapter_num,
                    title=chapter_title,
                    content=chapter_content,
                    page_start=page_start,
                    page_end=page_end,
                    topics=topics
                )
                
                chapters.append(chapter)
        else:
            # Process regular "Chapter X" matches
            for i, match in enumerate(chapter_matches):
                chapter_start = match.start()
                chapter_end = chapter_matches[i + 1].start() if i + 1 < len(chapter_matches) else len(content)
                
                chapter_content = content[chapter_start:chapter_end]
                
                # Extract chapter number and title
                chapter_num_text = match.group(1).strip()
                chapter_title = match.group(2).strip()
                
                # Convert chapter number to integer
                chapter_num = self._convert_chapter_number(chapter_num_text)
                
                # Extract topics from chapter content
                topics = self._extract_topics_from_chapter(chapter_content)
                
                # Find page numbers
                page_start, page_end = self._find_page_range(chapter_content)
                
                chapter = Chapter(
                    number=chapter_num,
                    title=chapter_title,
                    content=chapter_content,
                    page_start=page_start,
                    page_end=page_end,
                    topics=topics
                )
                
                chapters.append(chapter)
        
        return chapters

    def _generate_default_topics(self, chapter_title: str) -> List[str]:
        """Generate default topics based on chapter title"""
        topics = []
        
        # Create meaningful topics based on chapter title
        if 'real numbers' in chapter_title.lower():
            topics = [
                "Introduction to Real Numbers",
                "Classification of Real Numbers",
                "Properties of Real Numbers",
                "Operations with Real Numbers",
                "Real Number Line",
                "Rational and Irrational Numbers",
                "Decimal Representation",
                "Applications of Real Numbers"
            ]
        elif 'algebra' in chapter_title.lower():
            topics = [
                "Introduction to Algebraic Expressions",
                "Variables and Constants",
                "Algebraic Operations",
                "Simplification of Expressions",
                "Factorization",
                "Algebraic Identities"
            ]
        elif 'geometry' in chapter_title.lower():
            topics = [
                "Basic Geometric Concepts",
                "Lines and Angles",
                "Triangles and Properties",
                "Geometric Constructions",
                "Area and Perimeter"
            ]
        else:
            # Generic topics
            topics = [
                f"Introduction to {chapter_title}",
                f"Basic Concepts of {chapter_title}",
                f"Properties and Rules",
                f"Problem Solving Techniques",
                f"Applications and Examples",
                f"Practice Exercises"
            ]
        
        return topics[:8]  # Limit to 8 topics
    
    def _convert_chapter_number(self, chapter_text: str) -> int:
        """Convert chapter number text to integer"""
        chapter_text = chapter_text.strip()
        
        # Handle direct numeric chapters
        if chapter_text.isdigit():
            return int(chapter_text)
        
        # Handle word-based chapters
        number_map = {
            'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
            'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10
        }
        
        chapter_lower = chapter_text.lower()
        if chapter_lower in number_map:
            return number_map[chapter_lower]
        else:
            return 1  # Default
    
    def _extract_topics_from_chapter(self, chapter_content: str) -> List[str]:
        """Extract main topics/sections from chapter content"""
        topics = []
        
        # Look for various patterns that indicate topics/sections
        section_patterns = [
            r'^\d+\.\d+\s+([^\n]+)',  # 3.1 Topic Name
            r'^\d+\.\s+([^\n]+)',     # 1. Topic Name
            r'^([A-Z][A-Za-z\s]+):\s*$',  # Topic Name:
            r'^([A-Z][^.!?\n]*[.!?])\s*$',  # Standalone sentences that might be headings
            r'^([A-Z][A-Za-z\s]{10,50})\s*$',  # Capitalized phrases
        ]
        
        lines = chapter_content.split('\n')
        for line in lines:
            line = line.strip()
            if not line or len(line) < 5:
                continue
                
            for pattern in section_patterns:
                match = re.match(pattern, line, re.MULTILINE)
                if match:
                    topic = match.group(1).strip()
                    # Filter out common non-topic content
                    if (len(topic) > 10 and len(topic) < 100 and 
                        not topic.lower().startswith('page') and
                        not topic.lower().startswith('chapter') and
                        not re.match(r'^\d+$', topic) and
                        not topic.lower() in ['contents', 'preface', 'introduction']):
                        topics.append(topic)
                    break
        
        # If no topics found using patterns, extract meaningful sentences
        if not topics:
            sentences = re.findall(r'[A-Z][^.!?]*[.!?]', chapter_content)
            for sentence in sentences[:10]:
                sentence = sentence.strip()
                if (20 <= len(sentence) <= 100 and 
                    not sentence.lower().startswith('page') and
                    not sentence.lower().startswith('chapter')):
                    topics.append(sentence)
        
        # Remove duplicates while preserving order
        seen = set()
        unique_topics = []
        for topic in topics:
            topic_lower = topic.lower()
            if topic_lower not in seen:
                seen.add(topic_lower)
                unique_topics.append(topic)
        
        return unique_topics[:10]  # Limit to first 10 topics
    
    def _find_page_range(self, chapter_content: str) -> Tuple[int, int]:
        """Find the page range for a chapter"""
        page_matches = re.findall(r'--- Page (\d+) ---', chapter_content)
        
        if page_matches:
            pages = [int(p) for p in page_matches]
            return min(pages), max(pages)
        
        return 1, 1
    
    def _count_pages(self, content: str) -> int:
        """Count total pages in the textbook"""
        page_matches = re.findall(r'--- Page (\d+) ---', content)
        return len(page_matches) if page_matches else 0
    
    def generate_learning_content(self, textbook: TextbookContent) -> Dict[str, Any]:
        """Generate structured learning content for the frontend"""
        arena_data = {
            'id': f'arena-{textbook.subject.lower()}',
            'name': f'{textbook.subject} Arena',
            'subject': textbook.subject,
            'description': f'Master {textbook.subject} concepts from NCTB Grade {textbook.grade} curriculum',
            'icon': self._get_subject_icon(textbook.subject),
            'color': self._get_subject_color(textbook.subject),
            'bgGradient': self._get_subject_gradient(textbook.subject),
            'totalAdventures': len(textbook.chapters),
            'completedAdventures': 0,
            'totalXP': len(textbook.chapters) * 500,  # 500 XP per chapter
            'earnedXP': 0,
            'isUnlocked': True,
            'adventures': []
        }
        
        # Generate adventures (chapters)
        for i, chapter in enumerate(textbook.chapters):
            adventure_data = {
                'id': f'adventure-{textbook.subject.lower()}-{chapter.number}',
                'arenaId': arena_data['id'],
                'name': chapter.title,
                'chapter': f'Chapter {chapter.number}',
                'description': f'Learn about {chapter.title} from NCTB textbook',
                'difficulty': self._determine_difficulty(i, len(textbook.chapters)),
                'estimatedTime': max(30, len(chapter.topics) * 15),  # 15 min per topic
                'totalTopics': len(chapter.topics),
                'completedTopics': 0,
                'totalXP': 500,
                'earnedXP': 0,
                'isUnlocked': i == 0,  # Only first chapter unlocked initially
                'isCompleted': False,
                'topics': [],
                'chapterBonus': 100
            }
            
            # Generate topics
            for j, topic in enumerate(chapter.topics):
                topic_data = {
                    'id': f'topic-{textbook.subject.lower()}-{chapter.number}-{j+1}',
                    'adventureId': adventure_data['id'],
                    'name': topic,
                    'description': f'Learn about {topic}',
                    'content': self._extract_topic_content(chapter.content, topic),
                    'bloomLevel': self._determine_bloom_level(j, len(chapter.topics)),
                    'xpReward': 100,
                    'isCompleted': False,
                    'isUnlocked': j == 0,  # Only first topic unlocked initially
                    'questions': self._generate_sample_questions(topic, textbook.subject)
                }
                adventure_data['topics'].append(topic_data)
            
            arena_data['adventures'].append(adventure_data)
        
        return arena_data
    
    def _get_subject_icon(self, subject: str) -> str:
        """Get emoji icon for subject"""
        icons = {
            'Mathematics': '🔢',
            'Physics': '⚛️',
            'Chemistry': '🧪',
            'Biology': '🧬',
            'Bangla': '📚',
            'English': '🌍',
            'ICT': '💻'
        }
        return icons.get(subject, '📖')
    
    def _get_subject_color(self, subject: str) -> str:
        """Get color theme for subject"""
        colors = {
            'Mathematics': 'blue',
            'Physics': 'purple',
            'Chemistry': 'green',
            'Biology': 'red',
            'Bangla': 'yellow',
            'English': 'indigo',
            'ICT': 'gray'
        }
        return colors.get(subject, 'blue')
    
    def _get_subject_gradient(self, subject: str) -> str:
        """Get gradient background for subject"""
        gradients = {
            'Mathematics': 'bg-gradient-to-br from-blue-500/20 to-purple-500/20',
            'Physics': 'bg-gradient-to-br from-purple-500/20 to-pink-500/20',
            'Chemistry': 'bg-gradient-to-br from-green-500/20 to-emerald-500/20',
            'Biology': 'bg-gradient-to-br from-red-500/20 to-orange-500/20',
            'Bangla': 'bg-gradient-to-br from-yellow-500/20 to-orange-500/20',
            'English': 'bg-gradient-to-br from-indigo-500/20 to-blue-500/20',
            'ICT': 'bg-gradient-to-br from-gray-500/20 to-slate-500/20'
        }
        return gradients.get(subject, 'bg-gradient-to-br from-blue-500/20 to-purple-500/20')
    
    def _determine_difficulty(self, chapter_index: int, total_chapters: int) -> str:
        """Determine difficulty based on chapter position"""
        if chapter_index < total_chapters * 0.3:
            return 'Beginner'
        elif chapter_index < total_chapters * 0.7:
            return 'Intermediate'
        else:
            return 'Advanced'
    
    def _determine_bloom_level(self, topic_index: int, total_topics: int) -> int:
        """Determine Bloom's taxonomy level for topic"""
        # Distribute topics across Bloom levels 1-4 (Remember to Analyze)
        if topic_index < total_topics * 0.3:
            return 1  # Remember
        elif topic_index < total_topics * 0.6:
            return 2  # Understand
        elif topic_index < total_topics * 0.8:
            return 3  # Apply
        else:
            return 4  # Analyze
    
    def _extract_topic_content(self, chapter_content: str, topic: str) -> str:
        """Extract relevant content for a specific topic"""
        # This is a simplified extraction - in a real system, you'd use more sophisticated NLP
        lines = chapter_content.split('\n')
        topic_content = []
        
        # Find lines that mention the topic or are near topic mentions
        for i, line in enumerate(lines):
            if topic.lower() in line.lower():
                # Include surrounding context
                start = max(0, i - 5)
                end = min(len(lines), i + 10)
                topic_content.extend(lines[start:end])
                break
        
        if not topic_content:
            # Fallback: use first few paragraphs of chapter
            paragraphs = chapter_content.split('\n\n')[:3]
            topic_content = paragraphs
        
        content = '\n'.join(topic_content).strip()
        
        # Clean up the content
        content = re.sub(r'--- Page \d+ ---', '', content)
        content = re.sub(r'\n{3,}', '\n\n', content)
        
        return content[:2000] if content else f"Learn about {topic} in this comprehensive lesson."
    
    def _generate_sample_questions(self, topic: str, subject: str) -> List[Dict[str, Any]]:
        """Generate sample questions for a topic"""
        # This is a simplified question generator - in a real system, you'd use AI/NLP
        questions = [
            {
                'id': f'q1-{topic.lower().replace(" ", "-")}',
                'topicId': f'topic-{subject.lower()}-1-1',
                'question': f'What is the main concept of {topic}?',
                'type': 'multiple_choice',
                'bloomLevel': 1,
                'options': [
                    f'{topic} is a fundamental concept',
                    f'{topic} is an advanced technique',
                    f'{topic} is not important',
                    f'{topic} is only theoretical'
                ],
                'correctAnswer': f'{topic} is a fundamental concept',
                'explanation': f'{topic} is indeed a fundamental concept that students need to understand.',
                'points': 10
            },
            {
                'id': f'q2-{topic.lower().replace(" ", "-")}',
                'topicId': f'topic-{subject.lower()}-1-1',
                'question': f'How would you apply {topic} in real life?',
                'type': 'short_answer',
                'bloomLevel': 3,
                'correctAnswer': f'{topic} can be applied in various real-world scenarios',
                'explanation': f'Understanding {topic} helps in practical problem-solving.',
                'points': 15
            }
        ]
        
        return questions

# Global instance
content_service = NCTBContentIngestionService()