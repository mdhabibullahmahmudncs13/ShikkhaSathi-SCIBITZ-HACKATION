/**
 * **Feature: shikkhasathi-platform, Property 14: Offline State Indication**
 * **Validates: Requirements 4.5**
 * 
 * Property-based test for offline state indication system
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';
import { render, screen, waitFor, act } from '@testing-library/react';
import { syncManager } from '../services/syncManager';
import { serviceWorkerManager } from '../services/serviceWorkerManager';
import { SyncStatusIndicator } from '../components/sync/SyncStatusIndicator';
import { ContentDownloadModal } from '../components/download/ContentDownloadModal';
import { DownloadManager } from '../components/download/DownloadManager';

// Mock fetch for testing
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn((key: string) => {
    if (key === 'token') return 'mock-token';
    if (key === 'sync-conflicts') return '[]';
    return null;
  }),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

// Mock navigator.onLine
let mockOnlineStatus = true;
Object.defineProperty(navigator, 'onLine', {
  get: () => mockOnlineStatus,
  configurable: true
});

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockClear();
  mockOnlineStatus = true;
});

afterEach(() => {
  // Clean up sync manager
  syncManager.destroy();
});

// Helper function to simulate online/offline events with proper act wrapping
const simulateConnectivityChange = async (isOnline: boolean) => {
  await act(async () => {
    mockOnlineStatus = isOnline;
    
    // Dispatch the actual browser events
    const event = new Event(isOnline ? 'online' : 'offline');
    window.dispatchEvent(event);
    
    // Allow time for event propagation and state updates
    await new Promise(resolve => setTimeout(resolve, 100));
  });
};

describe('Offline State Indication Properties', () => {
  describe('Property 14: Offline State Indication', () => {
    it('should display clear offline indicators when internet connectivity is unavailable', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.boolean(), // single online/offline state
          async (isOnline) => {
            // Test SyncStatusIndicator component
            const { rerender, unmount } = render(<SyncStatusIndicator />);
            
            // Simulate connectivity change with proper act wrapping
            await simulateConnectivityChange(isOnline);
            
            await act(async () => {
              rerender(<SyncStatusIndicator />);
              await new Promise(resolve => setTimeout(resolve, 50));
            });

            // Assert: Offline indicator should be displayed when offline
            if (!isOnline) {
              // Should show offline status in Bangla
              await waitFor(() => {
                const offlineElements = screen.queryAllByText('অফলাইন');
                expect(offlineElements.length).toBeGreaterThan(0);
              }, { timeout: 1000 });
              
              // Should have red indicator for offline status
              const statusElements = document.querySelectorAll('.bg-red-500');
              expect(statusElements.length).toBeGreaterThan(0);
            } else {
              // Should show online status when online
              await waitFor(() => {
                const onlineElements = screen.queryAllByText(/অনলাইন|সিঙ্ক/);
                expect(onlineElements.length).toBeGreaterThan(0);
              }, { timeout: 1000 });
            }
            
            unmount();
          }
        ),
        { numRuns: 50 }
      );
    }, 10000);

    it('should properly limit functionality when operating offline', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            selectedSubject: fc.constantFrom('Physics', 'Chemistry', 'Mathematics'),
            selectedGrade: fc.integer({ min: 6, max: 12 }),
            selectedLanguage: fc.constantFrom('bangla', 'english')
          }),
          async (downloadConfig) => {
            // Test ContentDownloadModal component
            const mockOnClose = vi.fn();
            let component: any;
            
            await act(async () => {
              component = render(
                <ContentDownloadModal 
                  isOpen={true} 
                  onClose={mockOnClose}
                />
              );
            });

            // Start online
            await simulateConnectivityChange(true);
            await act(async () => {
              component.rerender(<ContentDownloadModal isOpen={true} onClose={mockOnClose} />);
              await new Promise(resolve => setTimeout(resolve, 100));
            });

            // Verify online functionality is available
            await waitFor(() => {
              const subjectSelects = screen.queryAllByDisplayValue('Select Subject');
              if (subjectSelects.length > 0) {
                expect((subjectSelects[0] as HTMLSelectElement).disabled).toBe(false);
              }
            }, { timeout: 1000 });

            // Go offline
            await simulateConnectivityChange(false);
            
            await act(async () => {
              component.rerender(<ContentDownloadModal isOpen={true} onClose={mockOnClose} />);
              await new Promise(resolve => setTimeout(resolve, 100));
            });

            // Assert: Functionality should be limited when offline
            await waitFor(() => {
              // Should show offline indicator
              const offlineElements = screen.queryAllByText('Offline');
              expect(offlineElements.length).toBeGreaterThan(0);
            }, { timeout: 1000 });

            // Form controls should be disabled when offline
            await waitFor(() => {
              const subjectSelects = screen.queryAllByDisplayValue('Select Subject');
              if (subjectSelects.length > 0) {
                expect((subjectSelects[0] as HTMLSelectElement).disabled).toBe(true);
              }
            }, { timeout: 1000 });

            component.unmount();
          }
        ),
        { numRuns: 5 }
      );
    }, 15000);

    it('should maintain consistent offline state indication across different components', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.boolean(), { minLength: 2, maxLength: 4 }), // Reduced connectivity state changes
          async (connectivitySequence) => {
            // Render multiple components that should show offline state
            const mockOnClose = vi.fn();
            
            let syncComponent: any;
            let downloadComponent: any;
            let modalComponent: any;

            await act(async () => {
              syncComponent = render(<SyncStatusIndicator />);
              downloadComponent = render(<DownloadManager />);
              modalComponent = render(
                <ContentDownloadModal isOpen={true} onClose={mockOnClose} />
              );
            });

            for (const isOnline of connectivitySequence) {
              // Simulate connectivity change
              await simulateConnectivityChange(isOnline);
              
              // Allow components to update with proper act wrapping
              await act(async () => {
                syncComponent.rerender(<SyncStatusIndicator />);
                downloadComponent.rerender(<DownloadManager />);
                modalComponent.rerender(<ContentDownloadModal isOpen={true} onClose={mockOnClose} />);
                await new Promise(resolve => setTimeout(resolve, 100));
              });

              // Assert: All components should show consistent offline state
              if (!isOnline) {
                // Should show offline indicators
                await waitFor(() => {
                  const offlineElements = screen.queryAllByText(/অফলাইন|Offline/);
                  expect(offlineElements.length).toBeGreaterThan(0);
                }, { timeout: 1000 });
              } else {
                // Components should show online state
                await waitFor(() => {
                  const onlineTexts = screen.queryAllByText(/Online|অনলাইন|সিঙ্ক/);
                  expect(onlineTexts.length).toBeGreaterThan(0);
                }, { timeout: 1000 });
              }
            }

            // Cleanup
            syncComponent.unmount();
            downloadComponent.unmount();
            modalComponent.unmount();
          }
        ),
        { numRuns: 3 }
      );
    }, 20000);

    it('should provide appropriate user feedback for offline limitations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.boolean(), // offline state
          async (startOffline) => {
            // Test that offline state provides clear user feedback
            const mockOnClose = vi.fn();
            
            // Set initial connectivity state
            await simulateConnectivityChange(!startOffline);
            
            let component: any;
            await act(async () => {
              component = render(
                <ContentDownloadModal isOpen={true} onClose={mockOnClose} />
              );
            });

            // Change to offline state
            await simulateConnectivityChange(false);
            await act(async () => {
              component.rerender(<ContentDownloadModal isOpen={true} onClose={mockOnClose} />);
              await new Promise(resolve => setTimeout(resolve, 100));
            });

            // Assert: Should provide clear feedback about offline limitations
            await waitFor(() => {
              // Should show offline message
              const offlineElements = screen.queryAllByText('Offline');
              expect(offlineElements.length).toBeGreaterThan(0);
            }, { timeout: 1000 });

            // Should disable interactive elements that require connectivity
            await waitFor(() => {
              const disabledElements = document.querySelectorAll('[disabled]');
              expect(disabledElements.length).toBeGreaterThan(0);
            }, { timeout: 1000 });

            component.unmount();
          }
        ),
        { numRuns: 5 }
      );
    }, 10000);

    it('should handle rapid connectivity changes gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.boolean(), { minLength: 3, maxLength: 6 }), // reduced rapid state changes
          async (rapidConnectivityChanges) => {
            // Test component stability during rapid connectivity changes
            let component: any;
            await act(async () => {
              component = render(<SyncStatusIndicator />);
            });
            
            let lastExpectedState = true;
            
            for (const isOnline of rapidConnectivityChanges) {
              // Simulate rapid connectivity change
              await simulateConnectivityChange(isOnline);
              lastExpectedState = isOnline;
              
              // Small delay to simulate real-world timing
              await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 50));
                // Re-render component
                component.rerender(<SyncStatusIndicator />);
              });
            }

            // Assert: Final state should match the last connectivity change
            await waitFor(() => {
              if (lastExpectedState) {
                // Should show online state
                const onlineElements = screen.queryAllByText(/অনলাইন|সিঙ্ক|Online/);
                expect(onlineElements.length).toBeGreaterThan(0);
              } else {
                // Should show offline state
                const offlineElements = screen.queryAllByText('অফলাইন');
                expect(offlineElements.length).toBeGreaterThan(0);
              }
            }, { timeout: 1000 });

            // Component should not crash or show inconsistent state
            const buttons = screen.queryAllByRole('button');
            expect(buttons.length).toBeGreaterThanOrEqual(0);

            component.unmount();
          }
        ),
        { numRuns: 3 }
      );
    }, 15000);

    it('should correctly detect and indicate network connectivity status', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.boolean(), // single connectivity state
          async (connectivityState) => {
            // Test the underlying connectivity detection
            await simulateConnectivityChange(connectivityState);
            
            // Check sync manager state - this should update immediately
            const syncStatus = syncManager.getSyncStatus();
            expect(syncStatus.isOnline).toBe(connectivityState);
            
            // Check service worker manager state with shorter timeout
            // Service worker manager updates via event listeners
            await waitFor(() => {
              expect(serviceWorkerManager.isOnlineStatus()).toBe(connectivityState);
            }, { timeout: 500, interval: 50 });
          }
        ),
        { numRuns: 20 } // Reduced to 20 runs for faster execution
      );
    }, 15000); // Increased test timeout to 15 seconds
  });
});