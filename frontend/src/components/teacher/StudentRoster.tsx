import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  Search, 
  Filter, 
  SortAsc, 
  SortDesc, 
  User, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Award,
  MoreVertical,
  RefreshCw
} from 'lucide-react';
import { StudentSummary, StudentFilter } from '../../types/teacher';

interface StudentRosterProps {
  students: StudentSummary[];
  classId: string;
  onStudentSelect: (studentId: string) => void;
  onStudentAction: (studentId: string, action: string) => void;
  onRefresh?: () => Promise<void>;
  autoRefreshInterval?: number; // in milliseconds, default 30000 (30 seconds)
}

type SortField = 'name' | 'averageScore' | 'timeSpent' | 'lastActive' | 'currentStreak';
type SortDirection = 'asc' | 'desc';

export const StudentRoster: React.FC<StudentRosterProps> = ({
  students,
  classId,
  onStudentSelect,
  onStudentAction,
  onRefresh,
  autoRefreshInterval = 30000
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<StudentFilter>({});
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date>(new Date());

  // Auto-refresh functionality
  useEffect(() => {
    if (!onRefresh || autoRefreshInterval <= 0) return;

    const intervalId = setInterval(async () => {
      try {
        await onRefresh();
        setLastRefreshTime(new Date());
      } catch (error) {
        console.error('Auto-refresh failed:', error);
      }
    }, autoRefreshInterval);

    return () => clearInterval(intervalId);
  }, [onRefresh, autoRefreshInterval]);

  // Manual refresh handler
  const handleManualRefresh = useCallback(async () => {
    if (!onRefresh || isRefreshing) return;

    try {
      setIsRefreshing(true);
      await onRefresh();
      setLastRefreshTime(new Date());
    } catch (error) {
      console.error('Manual refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [onRefresh, isRefreshing]);

  const filteredAndSortedStudents = useMemo(() => {
    let filtered = students.filter(student => {
      // Search filter
      if (searchQuery && !student.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !student.email.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Risk level filter
      if (filter.riskLevel && student.riskLevel !== filter.riskLevel) {
        return false;
      }

      // Performance range filter
      if (filter.performanceRange) {
        const { min, max } = filter.performanceRange;
        if (student.averageScore < min || student.averageScore > max) {
          return false;
        }
      }

      // Last active range filter
      if (filter.lastActiveRange) {
        const lastActive = new Date(student.lastActive);
        if (lastActive < filter.lastActiveRange.start || lastActive > filter.lastActiveRange.end) {
          return false;
        }
      }

      return true;
    });

    // Sort
    filtered.sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      if (sortField === 'lastActive') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [students, searchQuery, filter, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleStudentSelect = (studentId: string, selected: boolean) => {
    const newSelected = new Set(selectedStudents);
    if (selected) {
      newSelected.add(studentId);
    } else {
      newSelected.delete(studentId);
    }
    setSelectedStudents(newSelected);
  };

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getRiskLevelIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high': return <AlertTriangle className="h-4 w-4" />;
      case 'medium': return <Clock className="h-4 w-4" />;
      case 'low': return <CheckCircle className="h-4 w-4" />;
      default: return <User className="h-4 w-4" />;
    }
  };

  const getPerformanceTrend = (student: StudentSummary) => {
    // This would typically come from historical data
    // For now, we'll simulate based on current performance
    if (student.averageScore >= 80) {
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    } else if (student.averageScore < 60) {
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    }
    return null;
  };

  const getTimeSinceLastRefresh = () => {
    const seconds = Math.floor((new Date().getTime() - lastRefreshTime.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Student Roster ({filteredAndSortedStudents.length})
            </h2>
            {onRefresh && (
              <p className="text-xs text-gray-500 mt-1">
                Last updated: {getTimeSinceLastRefresh()}
              </p>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {selectedStudents.size > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  {selectedStudents.size} selected
                </span>
                <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">
                  Bulk Actions
                </button>
              </div>
            )}
            {onRefresh && (
              <button
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className={`p-2 rounded-md text-gray-600 hover:bg-gray-100 ${isRefreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
                title="Refresh data"
              >
                <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            )}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-md ${showFilters ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <Filter className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search students by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-md">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Risk Level
                </label>
                <select
                  value={filter.riskLevel || ''}
                  onChange={(e) => setFilter({...filter, riskLevel: e.target.value as any})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All levels</option>
                  <option value="low">Low Risk</option>
                  <option value="medium">Medium Risk</option>
                  <option value="high">High Risk</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Performance Range
                </label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    placeholder="Min %"
                    min="0"
                    max="100"
                    value={filter.performanceRange?.min || ''}
                    onChange={(e) => setFilter({
                      ...filter,
                      performanceRange: {
                        ...filter.performanceRange,
                        min: parseInt(e.target.value) || 0,
                        max: filter.performanceRange?.max || 100
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="number"
                    placeholder="Max %"
                    min="0"
                    max="100"
                    value={filter.performanceRange?.max || ''}
                    onChange={(e) => setFilter({
                      ...filter,
                      performanceRange: {
                        min: filter.performanceRange?.min || 0,
                        ...filter.performanceRange,
                        max: parseInt(e.target.value) || 100
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => setFilter({})}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Student List */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedStudents.size === filteredAndSortedStudents.length && filteredAndSortedStudents.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedStudents(new Set(filteredAndSortedStudents.map(s => s.id)));
                    } else {
                      setSelectedStudents(new Set());
                    }
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th className="px-6 py-3 text-left">
                <button
                  onClick={() => handleSort('name')}
                  className="flex items-center text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
                >
                  Student
                  {sortField === 'name' && (
                    sortDirection === 'asc' ? <SortAsc className="ml-1 h-4 w-4" /> : <SortDesc className="ml-1 h-4 w-4" />
                  )}
                </button>
              </th>
              <th className="px-6 py-3 text-left">
                <button
                  onClick={() => handleSort('averageScore')}
                  className="flex items-center text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
                >
                  Performance
                  {sortField === 'averageScore' && (
                    sortDirection === 'asc' ? <SortAsc className="ml-1 h-4 w-4" /> : <SortDesc className="ml-1 h-4 w-4" />
                  )}
                </button>
              </th>
              <th className="px-6 py-3 text-left">
                <button
                  onClick={() => handleSort('currentStreak')}
                  className="flex items-center text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
                >
                  Engagement
                  {sortField === 'currentStreak' && (
                    sortDirection === 'asc' ? <SortAsc className="ml-1 h-4 w-4" /> : <SortDesc className="ml-1 h-4 w-4" />
                  )}
                </button>
              </th>
              <th className="px-6 py-3 text-left">
                <button
                  onClick={() => handleSort('lastActive')}
                  className="flex items-center text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
                >
                  Last Active
                  {sortField === 'lastActive' && (
                    sortDirection === 'asc' ? <SortAsc className="ml-1 h-4 w-4" /> : <SortDesc className="ml-1 h-4 w-4" />
                  )}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Risk Level
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredAndSortedStudents.map((student) => (
              <tr
                key={student.id}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => onStudentSelect(student.id)}
              >
                <td className="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={selectedStudents.has(student.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleStudentSelect(student.id, e.target.checked);
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                        <User className="h-5 w-5 text-gray-600" />
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{student.name}</div>
                      <div className="text-sm text-gray-500">{student.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className="text-sm text-gray-900">
                      {student.averageScore}%
                    </div>
                    <div className="ml-2">
                      {getPerformanceTrend(student)}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    Level {student.currentLevel} • {student.totalXP} XP
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <Award className="h-4 w-4 text-yellow-500 mr-1" />
                    <span className="text-sm text-gray-900">{student.currentStreak} days</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {Math.round(student.timeSpent / 60)}h total
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {new Date(student.lastActive).toLocaleDateString()}
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRiskLevelColor(student.riskLevel)}`}>
                    {getRiskLevelIcon(student.riskLevel)}
                    <span className="ml-1 capitalize">{student.riskLevel}</span>
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Handle dropdown menu
                      }}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredAndSortedStudents.length === 0 && (
        <div className="text-center py-12">
          <User className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No students found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Try adjusting your search or filter criteria.
          </p>
        </div>
      )}
    </div>
  );
};

export default StudentRoster;