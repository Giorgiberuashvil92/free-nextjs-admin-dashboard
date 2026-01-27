'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getAllUsersEvents, type AllUsersEventsItem } from '@/services/analyticsApi';

export default function ActiveUsersWidget() {
  const [activeUsers, setActiveUsers] = useState<AllUsersEventsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadActiveUsers = async () => {
      try {
        setLoading(true);
        // ვიღებთ კვირის მონაცემებს და ვაჩვენებთ ტოპ 5-ს
        const data = await getAllUsersEvents('week', 100);
        // ვალაგებთ eventsCount-ის მიხედვით და ვიღებთ ტოპ 5-ს
        const sorted = data
          .sort((a, b) => b.eventsCount - a.eventsCount)
          .slice(0, 5);
        setActiveUsers(sorted);
      } catch (error) {
        console.error('Error loading active users:', error);
        setActiveUsers([]);
      } finally {
        setLoading(false);
      }
    };

    loadActiveUsers();
    // ვანახლებთ ყოველ 30 წამში
    const interval = setInterval(loadActiveUsers, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="mx-auto mb-10 w-full max-w-60 rounded-2xl bg-gray-50 px-4 py-5 dark:bg-white/3">
        <h3 className="mb-4 font-semibold text-gray-900 dark:text-white">
          ყველაზე აქტიური იუზერები
        </h3>
        <div className="text-sm text-gray-500 dark:text-gray-400">იტვირთება...</div>
      </div>
    );
  }

  if (activeUsers.length === 0) {
    return (
      <div className="mx-auto mb-10 w-full max-w-60 rounded-2xl bg-gray-50 px-4 py-5 dark:bg-white/3">
        <h3 className="mb-4 font-semibold text-gray-900 dark:text-white">
          ყველაზე აქტიური იუზერები
        </h3>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          მონაცემები არ მოიძებნა
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto mb-10 w-full max-w-60 rounded-2xl bg-gray-50 px-4 py-5 dark:bg-white/3">
      <h3 className="mb-4 font-semibold text-gray-900 dark:text-white">
        ყველაზე აქტიური იუზერები
      </h3>
      <div className="space-y-3">
        {activeUsers.map((user, index) => {
          const userName = user.userInfo?.firstName && user.userInfo?.lastName
            ? `${user.userInfo.firstName} ${user.userInfo.lastName}`
            : user.userInfo?.phone || user.userId;
          
          const userImage = user.userInfo?.phone 
            ? `/images/user/user-${(user.userInfo.phone.charCodeAt(user.userInfo.phone.length - 1) % 38) + 1}.jpg`
            : null;

          return (
            <Link
              key={user.userId}
              href={`/user-events?userId=${user.userId}`}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-white dark:hover:bg-gray-800 transition-colors"
            >
              <div className="shrink-0 relative">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm ${
                  index === 0 ? 'bg-yellow-500' : 
                  index === 1 ? 'bg-gray-400' : 
                  index === 2 ? 'bg-amber-600' : 
                  'bg-brand-500'
                }`}>
                  {index + 1}
                </div>
                {userImage ? (
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full border-2 border-white dark:border-gray-900 overflow-hidden bg-gray-200">
                    <Image
                      src={userImage}
                      alt={userName}
                      width={32}
                      height={32}
                      className="object-cover"
                      onError={(e) => {
                        // Fallback თუ სურათი არ იტვირთება
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        if (target.parentElement) {
                          target.parentElement.innerHTML = '<div class="w-full h-full bg-brand-500 flex items-center justify-center text-white text-xs font-semibold">' + userName.charAt(0).toUpperCase() + '</div>';
                        }
                      }}
                    />
                  </div>
                ) : (
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full border-2 border-white dark:border-gray-900 bg-brand-500 flex items-center justify-center text-white text-xs font-semibold">
                    {userName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {userName}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {user.eventsCount} მოვლენა
                </div>
              </div>
            </Link>
          );
        })}
      </div>
      <Link
        href="/user-events"
        className="mt-4 block text-center text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300 font-medium"
      >
        ყველას ნახვა →
      </Link>
    </div>
  );
}
