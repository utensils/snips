import { type ReactElement, useEffect, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import {
  clearAllAnalytics,
  clearAnalyticsBefore,
  exportAnalyticsToJson,
  getGlobalAnalytics,
  getSettings,
  updateSettings,
  getSnippetAnalytics,
} from '@/lib/api';
import type { GlobalAnalytics, SnippetAnalytics } from '@/types/analytics';
import type { AppSettings } from '@/types/settings';

/**
 * Analytics Tab
 * Provides comprehensive analytics dashboard showing snippet usage statistics
 */
/**
 * Date range options for filtering analytics
 */
type DateRange = 'all' | '7days' | '30days' | '90days';

export function AnalyticsTab(): ReactElement {
  const [analytics, setAnalytics] = useState<GlobalAnalytics | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [selectedSnippetId, setSelectedSnippetId] = useState<number | null>(null);
  const [snippetDetails, setSnippetDetails] = useState<SnippetAnalytics | null>(null);

  // Load analytics and settings on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      const [analyticsData, settingsData] = await Promise.all([
        getGlobalAnalytics(10, 20),
        getSettings(),
      ]);
      setAnalytics(analyticsData);
      setSettings(settingsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleAnalytics = async (enabled: boolean): Promise<void> => {
    if (!settings) return;

    try {
      setIsProcessing(true);
      setError(null);
      const updatedSettings: AppSettings = {
        ...settings,
        privacy_settings: {
          ...settings.privacy_settings,
          enable_analytics: enabled,
          track_usage: enabled,
        },
      };
      await updateSettings(updatedSettings);
      setSettings(updatedSettings);
      showSuccess(enabled ? 'Analytics enabled' : 'Analytics disabled');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update settings');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportAnalytics = async (): Promise<void> => {
    try {
      setIsProcessing(true);
      setError(null);
      const jsonData = await exportAnalyticsToJson();

      // Create a blob and download
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `snips-analytics-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showSuccess('Analytics exported successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export analytics');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClearOldAnalytics = async (days: number): Promise<void> => {
    if (!confirm(`Are you sure you want to delete analytics data older than ${days} days?`)) {
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);
      const cutoffTimestamp = Math.floor((Date.now() - days * 24 * 60 * 60 * 1000) / 1000);
      const deleted = await clearAnalyticsBefore(cutoffTimestamp);
      showSuccess(`Deleted ${deleted} analytics records`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear old analytics');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClearAllAnalytics = async (): Promise<void> => {
    if (!confirm('Are you sure you want to delete ALL analytics data? This cannot be undone.')) {
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);
      await clearAllAnalytics();
      showSuccess('All analytics data cleared');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear analytics');
    } finally {
      setIsProcessing(false);
    }
  };

  const showSuccess = (message: string): void => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleSnippetClick = async (snippetId: number): Promise<void> => {
    try {
      setSelectedSnippetId(snippetId);
      setError(null);
      const details = await getSnippetAnalytics(snippetId);
      setSnippetDetails(details);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load snippet details');
    }
  };

  const handleCloseDrillDown = (): void => {
    setSelectedSnippetId(null);
    setSnippetDetails(null);
  };

  const getFilteredActivity = (): GlobalAnalytics | null => {
    if (!analytics || dateRange === 'all') return analytics;

    const now = Date.now();
    const daysMap: Record<Exclude<DateRange, 'all'>, number> = {
      '7days': 7,
      '30days': 30,
      '90days': 90,
    };

    const days = daysMap[dateRange as Exclude<DateRange, 'all'>];
    const cutoffTimestamp = Math.floor((now - days * 24 * 60 * 60 * 1000) / 1000);

    return {
      ...analytics,
      recent_activity: analytics.recent_activity.filter(
        (activity) => activity.used_at >= cutoffTimestamp
      ),
    };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error && !analytics) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <Button onClick={loadData}>Retry</Button>
        </div>
      </Card>
    );
  }

  if (!analytics || !settings) {
    return <div />;
  }

  const filteredAnalytics = getFilteredActivity() || analytics;

  // Show snippet drill-down modal if selected
  if (selectedSnippetId !== null && snippetDetails) {
    return <SnippetDrillDown snippetDetails={snippetDetails} onBack={handleCloseDrillDown} />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Analytics Dashboard
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          View usage statistics and insights for your snippets
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <Card className="p-4 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </Card>
      )}

      {/* Success Message */}
      {successMessage && (
        <Card className="p-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <p className="text-green-600 dark:text-green-400">{successMessage}</p>
        </Card>
      )}

      {/* Privacy Controls (Z6) */}
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
              Privacy Settings
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Control analytics and usage tracking
            </p>
          </div>

          <div className="space-y-3">
            <label className="flex items-start space-x-3">
              <input
                type="checkbox"
                className="mt-1 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                checked={settings.privacy_settings.enable_analytics}
                onChange={(e) => handleToggleAnalytics(e.target.checked)}
                disabled={isProcessing}
              />
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Enable analytics tracking
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Track snippet usage to improve search ranking and provide insights. All data stays
                  on your device.
                </p>
              </div>
            </label>
          </div>
        </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard
          title="Total Snippets"
          value={analytics.total_snippets}
          icon="📝"
          description="All snippets in your library"
        />
        <SummaryCard
          title="Total Uses"
          value={analytics.total_usages}
          icon="🔢"
          description="Total snippet usage count"
        />
        <SummaryCard
          title="Most Used"
          value={analytics.most_used_snippets[0]?.usage_count || 0}
          icon="⭐"
          description={analytics.most_used_snippets[0]?.snippet_name || 'No data yet'}
        />
      </div>

      {/* Usage Frequency Visualization (Z4) */}
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
              Usage Frequency
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Visual representation of snippet usage
            </p>
          </div>

          {analytics.most_used_snippets.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-4">
              No usage data yet. Start using snippets to see analytics.
            </p>
          ) : (
            <UsageFrequencyChart snippets={analytics.most_used_snippets.slice(0, 5)} />
          )}
        </div>
      </Card>

      {/* Most Used Snippets Widget (Z2) */}
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
              Most Used Snippets
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Your top snippets by usage frequency
            </p>
          </div>

          {analytics.most_used_snippets.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-4">
              No usage data yet. Start using snippets to see analytics.
            </p>
          ) : (
            <div className="space-y-2">
              {analytics.most_used_snippets.map((snippet, index) => (
                <MostUsedSnippetRow
                  key={snippet.snippet_id}
                  rank={index + 1}
                  name={snippet.snippet_name}
                  usageCount={snippet.usage_count}
                  lastUsed={snippet.last_used}
                  onClick={() => handleSnippetClick(snippet.snippet_id)}
                />
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Recent Activity with Date Range Filter (Z3, Z5) */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
                Recent Activity
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Latest snippet usage events
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <DateRangeFilter value={dateRange} onChange={setDateRange} />
            </div>
          </div>

          {filteredAnalytics.recent_activity.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-4">
              No recent activity to display.
            </p>
          ) : (
            <div className="space-y-2">
              {filteredAnalytics.recent_activity.map((activity, index) => (
                <RecentActivityRow
                  key={`${activity.snippet_id}-${activity.used_at}-${index}`}
                  name={activity.snippet_name}
                  usedAt={activity.used_at}
                />
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Data Management (Z7, Z8) */}
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
              Data Management
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Export or clear your analytics data
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Export Analytics
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Download all analytics data as JSON
                </p>
              </div>
              <Button onClick={handleExportAnalytics} disabled={isProcessing} variant="secondary">
                Export
              </Button>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Clear Old Data
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Delete analytics older than 30 days
                </p>
              </div>
              <Button
                onClick={() => handleClearOldAnalytics(30)}
                disabled={isProcessing}
                variant="secondary"
              >
                Clear Old
              </Button>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Clear All Data
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Permanently delete all analytics data
                </p>
              </div>
              <Button onClick={handleClearAllAnalytics} disabled={isProcessing} variant="danger">
                Clear All
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

/**
 * Summary card component for displaying key metrics
 */
interface SummaryCardProps {
  title: string;
  value: number;
  icon: string;
  description: string;
}

function SummaryCard({ title, value, icon, description }: SummaryCardProps): ReactElement {
  return (
    <Card className="p-6">
      <div className="flex items-start space-x-4">
        <div className="text-3xl">{icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mt-1">{value}</p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 truncate">{description}</p>
        </div>
      </div>
    </Card>
  );
}

/**
 * Row component for most used snippets list
 */
interface MostUsedSnippetRowProps {
  rank: number;
  name: string;
  usageCount: number;
  lastUsed: number | null;
  onClick?: () => void;
}

function MostUsedSnippetRow({
  rank,
  name,
  usageCount,
  lastUsed,
  onClick,
}: MostUsedSnippetRowProps): ReactElement {
  const lastUsedText = lastUsed ? formatRelativeTime(lastUsed) : 'Never';

  return (
    <div
      className={`flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg ${
        onClick ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors' : ''
      }`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <div className="flex items-center space-x-3 flex-1 min-w-0">
        <span className="flex-shrink-0 w-6 text-center text-sm font-semibold text-gray-600 dark:text-gray-400">
          {rank}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-500">Last used {lastUsedText}</p>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
          {usageCount} {usageCount === 1 ? 'use' : 'uses'}
        </span>
        {onClick && (
          <span className="text-gray-400 dark:text-gray-500">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Row component for recent activity list
 */
interface RecentActivityRowProps {
  name: string;
  usedAt: number;
}

function RecentActivityRow({ name, usedAt }: RecentActivityRowProps): ReactElement {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate flex-1 min-w-0">
        {name}
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-500 flex-shrink-0 ml-4">
        {formatRelativeTime(usedAt)}
      </p>
    </div>
  );
}

/**
 * Format timestamp as relative time (e.g., "2 hours ago")
 */
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (years > 0) return `${years} ${years === 1 ? 'year' : 'years'} ago`;
  if (months > 0) return `${months} ${months === 1 ? 'month' : 'months'} ago`;
  if (weeks > 0) return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
  if (days > 0) return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  if (hours > 0) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  if (minutes > 0) return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  if (seconds > 10) return `${seconds} seconds ago`;
  return 'just now';
}

/**
 * Date range filter component (Z5)
 */
interface DateRangeFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

function DateRangeFilter({ value, onChange }: DateRangeFilterProps): ReactElement {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as DateRange)}
      className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      aria-label="Filter by date range"
    >
      <option value="all">All Time</option>
      <option value="7days">Last 7 Days</option>
      <option value="30days">Last 30 Days</option>
      <option value="90days">Last 90 Days</option>
    </select>
  );
}

/**
 * Usage frequency chart component using CSS bars (Z4)
 */
interface UsageFrequencyChartProps {
  snippets: Array<{ snippet_name: string; usage_count: number }>;
}

function UsageFrequencyChart({ snippets }: UsageFrequencyChartProps): ReactElement {
  const maxUsage = Math.max(...snippets.map((s) => s.usage_count), 1);

  return (
    <div className="space-y-3">
      {snippets.map((snippet) => {
        const percentage = (snippet.usage_count / maxUsage) * 100;
        return (
          <div key={snippet.snippet_name} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-900 dark:text-gray-100 truncate flex-1 mr-4">
                {snippet.snippet_name}
              </span>
              <span className="text-gray-600 dark:text-gray-400 flex-shrink-0">
                {snippet.usage_count} {snippet.usage_count === 1 ? 'use' : 'uses'}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
              <div
                className="bg-blue-600 dark:bg-blue-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${percentage}%` }}
                role="progressbar"
                aria-valuenow={snippet.usage_count}
                aria-valuemin={0}
                aria-valuemax={maxUsage}
                aria-label={`${snippet.snippet_name} usage: ${snippet.usage_count}`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Snippet drill-down view component (Z10)
 */
interface SnippetDrillDownProps {
  snippetDetails: SnippetAnalytics;
  onBack: () => void;
}

function SnippetDrillDown({ snippetDetails, onBack }: SnippetDrillDownProps): ReactElement {
  const firstUsedText = snippetDetails.first_used
    ? new Date(snippetDetails.first_used).toLocaleDateString()
    : 'Unknown';
  const lastUsedText = snippetDetails.last_used
    ? formatRelativeTime(snippetDetails.last_used)
    : 'Never';

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center space-x-4">
        <Button onClick={onBack} variant="secondary" aria-label="Go back">
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </Button>
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Snippet Analytics
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">Detailed usage statistics</p>
        </div>
      </div>

      {/* Detailed Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Uses</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {snippetDetails.usage_count}
            </p>
          </div>
        </Card>

        <Card className="p-6">
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Last Used</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{lastUsedText}</p>
          </div>
        </Card>

        <Card className="p-6">
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">First Used</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {firstUsedText}
            </p>
          </div>
        </Card>
      </div>

      {/* Usage Statistics */}
      <Card className="p-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Usage Pattern</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
              <span className="text-sm text-gray-600 dark:text-gray-400">Snippet ID</span>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {snippetDetails.snippet_id}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
              <span className="text-sm text-gray-600 dark:text-gray-400">Usage Count</span>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {snippetDetails.usage_count}
              </span>
            </div>
            {snippetDetails.first_used && (
              <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Days Since First Use
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {Math.floor((Date.now() - snippetDetails.first_used) / (1000 * 60 * 60 * 24))}
                </span>
              </div>
            )}
            {snippetDetails.first_used && snippetDetails.usage_count > 0 && (
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Average Uses Per Day
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {(
                    snippetDetails.usage_count /
                    Math.max(
                      1,
                      Math.floor((Date.now() - snippetDetails.first_used) / (1000 * 60 * 60 * 24))
                    )
                  ).toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
