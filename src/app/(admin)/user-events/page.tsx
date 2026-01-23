'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { getUserEvents, getAllUsersEvents, type UserEvent, type UserEventsResponse, type AllUsersEventsItem } from '@/services/analyticsApi';

export default function UserEventsPage() {
  const [viewMode, setViewMode] = useState<'all' | 'user'>('all');
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('week');
  const [limit, setLimit] = useState<number>(500);
  const [userId, setUserId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Filters
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(50);
  
  // For all users view
  const [allUsersEvents, setAllUsersEvents] = useState<AllUsersEventsItem[]>([]);
  
  // For single user view
  const [userEventsData, setUserEventsData] = useState<UserEventsResponse | null>(null);

  const loadAllUsersEvents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getAllUsersEvents(period, limit);
      setAllUsersEvents(data);
    } catch (e: unknown) {
      const message = e && typeof e === 'object' && 'message' in e 
        ? String((e as { message?: unknown }).message) 
        : 'Failed to load events';
      setError(message);
      setAllUsersEvents([]);
    } finally {
      setLoading(false);
    }
  }, [period, limit]);

  const loadUserEvents = useCallback(async () => {
    if (!userId.trim()) return;
    setLoading(true);
    setError('');
    try {
      const data = await getUserEvents(userId, period, limit);
      setUserEventsData(data);
    } catch (e: unknown) {
      const message = e && typeof e === 'object' && 'message' in e 
        ? String((e as { message?: unknown }).message) 
        : 'Failed to load events';
      setError(message);
      setUserEventsData(null);
    } finally {
      setLoading(false);
    }
  }, [userId, period, limit]);

  useEffect(() => {
    if (viewMode === 'all') {
      loadAllUsersEvents();
    } else if (viewMode === 'user' && userId) {
      loadUserEvents();
    }
  }, [viewMode, userId, loadAllUsersEvents, loadUserEvents]);

  useEffect(() => {
    setCurrentPage(1); // Reset to first page when filters change
  }, [eventTypeFilter, searchQuery, viewMode]);


  // Filter and search events
  const filteredEvents = useMemo(() => {
    if (!userEventsData?.events) return [];
    
    let filtered = userEventsData.events;
    
    // Filter by event type
    if (eventTypeFilter !== 'all') {
      filtered = filtered.filter(event => event.eventType === eventTypeFilter);
    }
    
    // Search in event name
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(event => 
        event.eventName.toLowerCase().includes(query) ||
        event.screen.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [userEventsData, eventTypeFilter, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredEvents.length / itemsPerPage);
  const paginatedEvents = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredEvents.slice(start, end);
  }, [filteredEvents, currentPage, itemsPerPage]);

  // Get unique event types for filter
  const eventTypes = useMemo(() => {
    if (!userEventsData?.events) return [];
    const types = new Set(userEventsData.events.map(e => e.eventType));
    return Array.from(types).sort();
  }, [userEventsData]);

  // Export to CSV
  const exportToCSV = () => {
    if (!userEventsData?.events || filteredEvents.length === 0) return;
    
    const headers = ['დრო', 'ტიპი', 'სახელი', 'ეკრანი', 'პარამეტრები'];
    const rows = filteredEvents.map(event => [
      event.dateFormatted || formatDate(event.date || event.timestamp),
      event.eventType,
      event.eventName,
      event.screen,
      event.paramsFormatted || JSON.stringify(event.params || {})
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `user-events-${userId}-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDate = (dateString: string | number) => {
    try {
      const date = typeof dateString === 'string' ? new Date(dateString) : new Date(dateString * 1000);
      return date.toLocaleString('ka-GE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return dateString.toString();
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-4">მომხმარებლის მოვლენები</h1>
        
        {/* Controls */}
        <div className="bg-white dark:bg-gray-800 border rounded-lg p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* View Mode */}
            <div>
              <label className="block text-sm font-medium mb-2">ნახვის რეჟიმი</label>
              <select
                value={viewMode}
                onChange={(e) => {
                  setViewMode(e.target.value as 'all' | 'user');
                  setUserEventsData(null);
                }}
                className="w-full border rounded px-3 py-2"
              >
                <option value="all">ყველა მომხმარებელი</option>
                <option value="user">კონკრეტული მომხმარებელი</option>
              </select>
            </div>

            {/* User ID (only for user mode) */}
            {viewMode === 'user' && (
              <div>
                <label className="block text-sm font-medium mb-2">მომხმარებლის ID</label>
                <input
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="usr_1768984908239"
                  className="w-full border rounded px-3 py-2"
                />
              </div>
            )}

            {/* Period */}
            <div>
              <label className="block text-sm font-medium mb-2">პერიოდი</label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as 'today' | 'week' | 'month')}
                className="w-full border rounded px-3 py-2"
              >
                <option value="today">დღეს</option>
                <option value="week">კვირა</option>
                <option value="month">თვე</option>
              </select>
            </div>

            {/* Limit */}
            <div>
              <label className="block text-sm font-medium mb-2">ლიმიტი</label>
              <input
                type="number"
                value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value) || 100)}
                min="1"
                max="1000"
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>

          {viewMode === 'user' && (
            <div className="mt-4">
              <button
                onClick={loadUserEvents}
                disabled={loading || !userId.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'იტვირთება...' : 'იტვირთება'}
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
      </div>

      {/* All Users View */}
      {viewMode === 'all' && (
        <div>
          {loading ? (
            <div className="text-center py-8">იტვირთება...</div>
          ) : allUsersEvents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              მოვლენები არ მოიძებნა
            </div>
          ) : (
            <div className="space-y-4">
              {allUsersEvents.map((userData) => (
                <div
                  key={userData.userId}
                  className="bg-white dark:bg-gray-800 border rounded-lg p-4"
                >
                  {/* User Info */}
                  {userData.userInfo && (
                    <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-900 rounded">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <span className="font-medium">მომხმარებელი:</span>{' '}
                          {userData.userInfo.firstName && userData.userInfo.lastName
                            ? `${userData.userInfo.firstName} ${userData.userInfo.lastName}`
                            : userData.userId}
                        </div>
                        <div>
                          <span className="font-medium">ტელეფონი:</span> {userData.userInfo.phone}
                        </div>
                        {userData.userInfo.email && (
                          <div>
                            <span className="font-medium">ელ. ფოსტა:</span> {userData.userInfo.email}
                          </div>
                        )}
                        <div>
                          <span className="font-medium">როლი:</span> {userData.userInfo.role} |{' '}
                          <span className="font-medium">დადასტურებული:</span>{' '}
                          {userData.userInfo.isVerified ? 'კი' : 'არა'}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-semibold">
                      მომხმარებელი: {userData.userId}
                    </h3>
                    <div className="text-sm text-gray-500">
                      <span className="font-medium">მოვლენების რაოდენობა:</span> {userData.eventsCount}
                    </div>
                  </div>
                  
                  {userData.lastActivityFormatted && (
                    <div className="text-sm text-gray-500 mb-3">
                      <span className="font-medium">ბოლო აქტივობა:</span>{' '}
                      {userData.lastActivityFormatted}
                    </div>
                  )}

                  {userData.events && userData.events.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">დრო</th>
                            <th className="text-left p-2">ტიპი</th>
                            <th className="text-left p-2">სახელი</th>
                            <th className="text-left p-2">ეკრანი</th>
                            <th className="text-left p-2">პარამეტრები</th>
                          </tr>
                        </thead>
                        <tbody>
                          {userData.events.map((event) => (
                            <tr key={event.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-700">
                              <td className="p-2">
                                {event.dateFormatted || formatDate(event.date || event.timestamp)}
                              </td>
                              <td className="p-2">
                                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                                  {event.eventType}
                                </span>
                              </td>
                              <td className="p-2 font-medium">{event.eventName}</td>
                              <td className="p-2">{event.screen}</td>
                              <td className="p-2">
                                {event.paramsFormatted || (Object.keys(event.params || {}).length > 0 ? (
                                  <details>
                                    <summary className="cursor-pointer text-blue-600">
                                      ნახვა
                                    </summary>
                                    <pre className="mt-2 text-xs bg-gray-100 dark:bg-gray-900 p-2 rounded overflow-auto">
                                      {event.paramsFormatted || JSON.stringify(event.params, null, 2)}
                                    </pre>
                                  </details>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                ))}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Single User View */}
      {viewMode === 'user' && userEventsData && (
        <div>
          {/* User Info Section */}
          {userEventsData.userInfo && (
            <div className="bg-white dark:bg-gray-800 border rounded-lg p-4 mb-4">
              <h2 className="text-xl font-semibold mb-3">მომხმარებლის ინფორმაცია</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <span className="font-medium">მომხმარებელი:</span>{' '}
                  {userEventsData.userInfo.firstName && userEventsData.userInfo.lastName
                    ? `${userEventsData.userInfo.firstName} ${userEventsData.userInfo.lastName}`
                    : userEventsData.userId}
                </div>
                <div>
                  <span className="font-medium">ტელეფონი:</span> {userEventsData.userInfo.phone}
                </div>
                {userEventsData.userInfo.email && (
                  <div>
                    <span className="font-medium">ელ. ფოსტა:</span> {userEventsData.userInfo.email}
                  </div>
                )}
                <div>
                  <span className="font-medium">როლი:</span> {userEventsData.userInfo.role}
                </div>
                <div>
                  <span className="font-medium">დადასტურებული:</span>{' '}
                  {userEventsData.userInfo.isVerified ? 'კი' : 'არა'}
                </div>
                {userEventsData.userInfo.createdAt && (
                  <div>
                    <span className="font-medium">რეგისტრაციის თარიღი:</span>{' '}
                    {formatDate(userEventsData.userInfo.createdAt)}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Summary Section */}
          <div className="bg-white dark:bg-gray-800 border rounded-lg p-4 mb-4">
            <h2 className="text-xl font-semibold mb-3">სტატისტიკა</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <span className="font-medium">მოვლენების რაოდენობა:</span>{' '}
                {userEventsData.totalEvents ?? filteredEvents.length}
              </div>
              {userEventsData.firstEvent && (
                <div>
                  <span className="font-medium">პირველი მოვლენა:</span>{' '}
                  {formatDate(userEventsData.firstEvent)}
                </div>
              )}
              {userEventsData.lastEvent && (
                <div>
                  <span className="font-medium">ბოლო აქტივობა:</span>{' '}
                  {formatDate(userEventsData.lastEvent)}
                </div>
              )}
            </div>
          </div>

          {/* Filters and Actions */}
          <div className="bg-white dark:bg-gray-800 border rounded-lg p-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              {/* Event Type Filter */}
              <div>
                <label className="block text-sm font-medium mb-2">ფილტრი ტიპით</label>
                <select
                  value={eventTypeFilter}
                  onChange={(e) => setEventTypeFilter(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="all">ყველა</option>
                  {eventTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {/* Search */}
              <div>
                <label className="block text-sm font-medium mb-2">ძიება</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="სახელი ან ეკრანი..."
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              {/* Items per page */}
              <div>
                <label className="block text-sm font-medium mb-2">გვერდზე</label>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(parseInt(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                  <option value="200">200</option>
                </select>
              </div>

              {/* Export Button */}
              <div>
                <button
                  onClick={exportToCSV}
                  disabled={filteredEvents.length === 0}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                >
                  ექსპორტი CSV
                </button>
              </div>
            </div>
          </div>

          {/* Events Table */}
          {loading ? (
            <div className="text-center py-8">იტვირთება...</div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              მოვლენები არ მოიძებნა
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50 dark:bg-gray-900">
                      <th className="text-left p-3">დრო</th>
                      <th className="text-left p-3">ტიპი</th>
                      <th className="text-left p-3">სახელი</th>
                      <th className="text-left p-3">ეკრანი</th>
                      <th className="text-left p-3">პარამეტრები</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedEvents.map((event) => (
                      <tr key={event.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="p-3">
                          {event.dateFormatted || formatDate(event.date || event.timestamp)}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                            {event.eventType}
                          </span>
                        </td>
                        <td className="p-3 font-medium">{event.eventName}</td>
                        <td className="p-3">{event.screen}</td>
                        <td className="p-3">
                          {event.paramsFormatted ? (
                            <details>
                              <summary className="cursor-pointer text-blue-600">
                                ნახვა
                              </summary>
                              <pre className="mt-2 text-xs bg-gray-100 dark:bg-gray-900 p-2 rounded overflow-auto">
                                {event.paramsFormatted}
                              </pre>
                            </details>
                          ) : Object.keys(event.params || {}).length > 0 ? (
                            <details>
                              <summary className="cursor-pointer text-blue-600">
                                ნახვა
                              </summary>
                              <pre className="mt-2 text-xs bg-gray-100 dark:bg-gray-900 p-2 rounded overflow-auto">
                                {JSON.stringify(event.params, null, 2)}
                              </pre>
                            </details>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="p-4 border-t flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    გვერდი {currentPage} {totalPages}-დან ({filteredEvents.length} მოვლენა)
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 border rounded disabled:opacity-50"
                    >
                      წინა
                    </button>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 border rounded disabled:opacity-50"
                    >
                      შემდეგი
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Empty state for user mode */}
      {viewMode === 'user' && !userEventsData && !loading && (
        <div className="text-center py-8 text-gray-500">
          შეიყვანეთ მომხმარებლის ID და დააჭირეთ &quot;იტვირთება&quot;
        </div>
      )}
    </div>
  );
}
