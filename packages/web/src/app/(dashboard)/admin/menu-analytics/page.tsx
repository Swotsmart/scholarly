'use client';

/**
 * Menu Analytics Page
 * Internal dashboard showing menu composition heatmaps, promotion rates,
 * decay rates, and seed acceptance rates across the user population.
 */

import { AnalyticsDashboard } from '@/components/analytics-dashboard';
import { getAllTasks } from '@/config/menu-registry';
import type { AnalyticsQuery, MenuAnalyticsDaily, MenuCompositionSnapshot } from '@/services/menu-analytics.service';

// Available roles for filtering
const ROLES = [
  { value: 'learner', label: 'Learner' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'parent', label: 'Parent' },
  { value: 'tutor', label: 'Tutor' },
  { value: 'admin', label: 'Admin' },
];

// Build task list from registry for the task filter
function getTaskOptions() {
  try {
    const tasks = getAllTasks();
    return tasks.map((t) => ({
      ref: t.ref,
      label: t.name,
      category: t.cluster,
    }));
  } catch {
    return [];
  }
}

// Stub query handler — in production, calls the API
async function handleQueryAnalytics(query: AnalyticsQuery): Promise<MenuAnalyticsDaily[]> {
  console.log('Querying analytics:', query);
  // Returns empty data until the analytics API is connected
  return [];
}

// Stub composition handler — in production, calls the API
async function handleGetComposition(
  roleId: string,
  date: string
): Promise<MenuCompositionSnapshot | null> {
  console.log('Getting composition:', roleId, date);
  return null;
}

export default function MenuAnalyticsPage() {
  return (
    <AnalyticsDashboard
      onQueryAnalytics={handleQueryAnalytics}
      onGetComposition={handleGetComposition}
      roles={ROLES}
      tasks={getTaskOptions()}
    />
  );
}
