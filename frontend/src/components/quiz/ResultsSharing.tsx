import React, { useState } from 'react';
import { QuizResult } from '../../types/quiz';

interface ResultsSharingProps {
  result: QuizResult;
  onClose: () => void;
}

const ResultsSharing: React.FC<ResultsSharingProps> = ({
  result,
  onClose,
}) => {
  const [shareMethod, setShareMethod] = useState<'link' | 'image' | 'pdf'>('link');
  const [isGenerating, setIsGenerating] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  const generateShareableContent = async () => {
    setIsGenerating(true);
    
    try {
      // Simulate generating shareable content
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (shareMethod === 'link') {
        const url = `${window.location.origin}/quiz-results/${result.quiz_id}`;
        setShareUrl(url);
        
        // Copy to clipboard
        await navigator.clipboard.writeText(url);
      } else if (shareMethod === 'image') {
        // Generate image (would use canvas or similar)
        console.log('Generating image...');
      } else if (shareMethod === 'pdf') {
        // Generate PDF (would use jsPDF or similar)
        console.log('Generating PDF...');
      }
    } catch (error) {
      console.error('Failed to generate shareable content:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const getPerformanceEmoji = (percentage: number) => {
    if (percentage >= 90) return '🏆';
    if (percentage >= 80) return '🎉';
    if (percentage >= 70) return '👍';
    if (percentage >= 60) return '📚';
    return '💪';
  };

  const shareToSocial = (platform: string) => {
    const emoji = getPerformanceEmoji(result.percentage);
    const text = `I just scored ${Math.round(result.percentage)}% on a ${result.subject} quiz! ${emoji} #ShikkhaSathi #Learning`;
    
    let url = '';
    switch (platform) {
      case 'twitter':
        url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        break;
      case 'facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}&quote=${encodeURIComponent(text)}`;
        break;
      case 'whatsapp':
        url = `https://wa.me/?text=${encodeURIComponent(text)}`;
        break;
    }
    
    if (url) {
      window.open(url, '_blank', 'width=600,height=400');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Share Your Results</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Results Preview */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-4 text-white mb-6">
            <div className="text-center">
              <div className="text-3xl mb-2">{getPerformanceEmoji(result.percentage)}</div>
              <div className="text-2xl font-bold">{Math.round(result.percentage)}%</div>
              <div className="text-blue-100">{result.subject} - {result.topic}</div>
              <div className="text-sm text-blue-200 mt-1">
                {result.total_score}/{result.max_score} points
              </div>
            </div>
          </div>

          {/* Share Method Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Choose sharing format:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'link', label: 'Link', icon: '🔗' },
                { id: 'image', label: 'Image', icon: '🖼️' },
                { id: 'pdf', label: 'PDF', icon: '📄' },
              ].map((method) => (
                <button
                  key={method.id}
                  onClick={() => setShareMethod(method.id as any)}
                  className={`p-3 rounded-lg border-2 text-center transition-colors ${
                    shareMethod === method.id
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-lg mb-1">{method.icon}</div>
                  <div className="text-sm font-medium">{method.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={generateShareableContent}
            disabled={isGenerating}
            className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
              isGenerating
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {isGenerating ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Generating...
              </div>
            ) : (
              `Generate ${shareMethod === 'link' ? 'Link' : shareMethod === 'image' ? 'Image' : 'PDF'}`
            )}
          </button>

          {/* Share URL */}
          {shareUrl && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium text-green-800">Link copied to clipboard!</span>
              </div>
              <div className="text-xs text-green-700 break-all">{shareUrl}</div>
            </div>
          )}

          {/* Social Media Sharing */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Share on social media:
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => shareToSocial('twitter')}
                className="flex-1 py-2 px-3 bg-blue-400 text-white rounded-lg hover:bg-blue-500 transition-colors text-sm font-medium"
              >
                Twitter
              </button>
              <button
                onClick={() => shareToSocial('facebook')}
                className="flex-1 py-2 px-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Facebook
              </button>
              <button
                onClick={() => shareToSocial('whatsapp')}
                className="flex-1 py-2 px-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
              >
                WhatsApp
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultsSharing;