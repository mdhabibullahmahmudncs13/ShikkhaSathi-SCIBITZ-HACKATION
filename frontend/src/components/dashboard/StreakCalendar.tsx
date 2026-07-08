import React from 'react';

interface StreakCalendarProps {
  currentStreak: number;
  longestStreak: number;
  activityData: { [date: string]: boolean }; // date in YYYY-MM-DD format
  className?: string;
}

const StreakCalendar: React.FC<StreakCalendarProps> = ({
  currentStreak,
  longestStreak,
  activityData,
  className = ''
}) => {
  // Generate last 7 weeks (49 days) for the calendar view
  const generateCalendarDays = () => {
    const days = [];
    const today = new Date();
    
    for (let i = 48; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateString = date.toISOString().split('T')[0];
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      const dayNumber = date.getDate();
      
      days.push({
        date: dateString,
        dayName,
        dayNumber,
        hasActivity: activityData[dateString] || false,
        isToday: dateString === today.toISOString().split('T')[0]
      });
    }
    
    return days;
  };

  const calendarDays = generateCalendarDays();
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Group days by weeks
  const weeks = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7));
  }

  return (
    <div className={`bg-white rounded-lg p-6 shadow-sm border border-gray-200 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Learning Streak</h3>
          <p className="text-sm text-gray-600">Keep up the great work!</p>
        </div>
        <div className="text-right">
          <div className="flex items-center space-x-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{currentStreak}</div>
              <div className="text-xs text-gray-500">Current</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{longestStreak}</div>
              <div className="text-xs text-gray-500">Best</div>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="space-y-2">
        {/* Week day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map((day) => (
            <div key={day} className="text-xs text-gray-500 text-center font-medium">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar weeks */}
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 gap-1">
            {week.map((day) => (
              <div
                key={day.date}
                className={`
                  w-8 h-8 rounded-md flex items-center justify-center text-xs font-medium
                  transition-all duration-200 hover:scale-110
                  ${day.hasActivity 
                    ? 'bg-green-500 text-white shadow-sm' 
                    : 'bg-gray-100 text-gray-400'
                  }
                  ${day.isToday 
                    ? 'ring-2 ring-blue-500 ring-offset-1' 
                    : ''
                  }
                `}
                title={`${day.date} - ${day.hasActivity ? 'Active' : 'No activity'}`}
              >
                {day.dayNumber}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center space-x-4 text-xs text-gray-600">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-gray-100 rounded"></div>
            <span>No activity</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span>Active day</span>
          </div>
        </div>
        
        {currentStreak > 0 && (
          <div className="flex items-center space-x-1 text-xs text-orange-600">
            <span>🔥</span>
            <span>{currentStreak} day streak!</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default StreakCalendar;