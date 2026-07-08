/**
 * TypeScript types for content management system
 * Arenas, Adventures, and Study Materials
 */

// Arena Types
export interface Arena {
  id: number;
  name: string;
  description: string;
  subject: string;
  grade: number;
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  learning_objectives: string[];
  prerequisites: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: number;
  adventures_count?: number;
  students_enrolled?: number;
}

export interface ArenaCreate {
  name: string;
  description: string;
  subject: string;
  grade: number;
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  learning_objectives: string[];
  prerequisites: string[];
}

export interface ArenaUpdate {
  name?: string;
  description?: string;
  subject?: string;
  grade?: number;
  difficulty_level?: 'beginner' | 'intermediate' | 'advanced';
  learning_objectives?: string[];
  prerequisites?: string[];
  is_active?: boolean;
}

// Adventure Types
export interface Adventure {
  id: number;
  name: string;
  description: string;
  arena_id: number;
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  estimated_duration: number;
  content_type: 'interactive' | 'quiz' | 'simulation' | 'video' | 'reading';
  learning_objectives: string[];
  bloom_levels: number[];
  content_data: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: number;
  arena_name?: string;
}

export interface AdventureCreate {
  name: string;
  description: string;
  arena_id: number;
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  estimated_duration: number;
  content_type: 'interactive' | 'quiz' | 'simulation' | 'video' | 'reading';
  learning_objectives: string[];
  bloom_levels: number[];
  content_data: Record<string, any>;
}

export interface AdventureUpdate {
  name?: string;
  description?: string;
  arena_id?: number;
  difficulty_level?: 'beginner' | 'intermediate' | 'advanced';
  estimated_duration?: number;
  content_type?: 'interactive' | 'quiz' | 'simulation' | 'video' | 'reading';
  learning_objectives?: string[];
  bloom_levels?: number[];
  content_data?: Record<string, any>;
  is_active?: boolean;
}

// Study Material Types
export type MaterialType = 'audio' | 'video' | 'mindmap' | 'report' | 'flashcard' | 'infographic' | 'slides';

export interface StudyMaterial {
  id: number;
  title: string;
  description: string;
  subject: string;
  grade: number;
  material_type: MaterialType;
  tags: string[];
  adventure_id?: number;
  arena_id?: number;
  file_name: string;
  file_size: number;
  file_type: string;
  is_active: boolean;
  download_count: number;
  created_at: string;
  updated_at: string;
  uploaded_by: number;
  file_size_formatted?: string;
}

export interface StudyMaterialCreate {
  title: string;
  description: string;
  subject: string;
  grade: number;
  material_type: MaterialType;
  tags: string[];
  adventure_id?: number;
  arena_id?: number;
}

export interface StudyMaterialUpdate {
  title?: string;
  description?: string;
  subject?: string;
  grade?: number;
  material_type?: MaterialType;
  tags?: string[];
  adventure_id?: number;
  arena_id?: number;
  is_active?: boolean;
}

// Material Type Configuration
export interface MaterialTypeConfig {
  id: MaterialType;
  name: string;
  icon: any; // Lucide icon component
  color: string;
  acceptedFormats: string[];
  description: string;
}

// API Response Types
export interface ArenaListResponse {
  arenas: Arena[];
  total: number;
  page: number;
  per_page: number;
}

export interface AdventureListResponse {
  adventures: Adventure[];
  total: number;
  page: number;
  per_page: number;
}

export interface StudyMaterialListResponse {
  materials: StudyMaterial[];
  total: number;
  page: number;
  per_page: number;
}

export interface FileUploadResponse {
  message: string;
  material_id: number;
  file_path: string;
  file_size: number;
}

// Bloom's Taxonomy Levels
export interface BloomLevel {
  level: number;
  name: string;
  description: string;
  color: string;
}

export const BLOOM_LEVELS: BloomLevel[] = [
  {
    level: 1,
    name: 'Remember',
    description: 'Recall facts and basic concepts',
    color: 'red'
  },
  {
    level: 2,
    name: 'Understand',
    description: 'Explain ideas or concepts',
    color: 'orange'
  },
  {
    level: 3,
    name: 'Apply',
    description: 'Use information in new situations',
    color: 'yellow'
  },
  {
    level: 4,
    name: 'Analyze',
    description: 'Draw connections among ideas',
    color: 'green'
  },
  {
    level: 5,
    name: 'Evaluate',
    description: 'Justify a stand or decision',
    color: 'blue'
  },
  {
    level: 6,
    name: 'Create',
    description: 'Produce new or original work',
    color: 'purple'
  }
];

// Subject Configuration
export const SUBJECTS = [
  'physics',
  'chemistry',
  'mathematics',
  'biology',
  'english',
  'bangla',
  'ict'
] as const;

export type Subject = typeof SUBJECTS[number];

// Grade Configuration
export const GRADES = [6, 7, 8, 9, 10, 11, 12] as const;
export type Grade = typeof GRADES[number];

// Difficulty Levels
export const DIFFICULTY_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
export type DifficultyLevel = typeof DIFFICULTY_LEVELS[number];

// Content Types
export const CONTENT_TYPES = ['interactive', 'quiz', 'simulation', 'video', 'reading'] as const;
export type ContentType = typeof CONTENT_TYPES[number];

// Filter and Search Types
export interface ContentFilters {
  subject?: Subject;
  grade?: Grade;
  difficulty_level?: DifficultyLevel;
  material_type?: MaterialType;
  content_type?: ContentType;
  search?: string;
  page?: number;
  per_page?: number;
}

// Content Statistics
export interface ContentStats {
  total_arenas: number;
  total_adventures: number;
  total_materials: number;
  materials_by_type: Record<MaterialType, number>;
  content_by_subject: Record<Subject, {
    arenas: number;
    adventures: number;
    materials: number;
  }>;
  recent_uploads: StudyMaterial[];
}