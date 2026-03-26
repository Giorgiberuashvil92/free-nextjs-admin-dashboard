'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiGetJson, API_BASE } from '@/lib/api';

interface PhoneUser {
  phone: string;
  userId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

interface Campaign {
  id: string;
  name: string;
  message: string;
  sentTo: number;
  createdAt: string;
  status: 'draft' | 'scheduled' | 'sent' | 'failed';
}

export default function SMSMarketingPage() {
  const [phones, setPhones] = useState<PhoneUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPhones, setSelectedPhones] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [campaignName, setCampaignName] = useState('');
  const [role, setRole] = useState('');
  const [activeOnly, setActiveOnly] = useState(true);
  const [smsType, setSmsType] = useState<1 | 2>(1); // 1 = რეკლამა, 2 = ინფორმაციული

  /** მხოლოდ იუზერები, რომლებსაც ჰქონდათ შესვლა 28 დეკემბერი 2025-ის შემდეგ */
  const LOGIN_AFTER = '2025-12-28T00:00:00.000Z';

  /** აპის ლინკები – დაჭერისას გახსნის აპს ან სტორს (ჩამოტვირთვა) */
  const APP_LINKS = {
    ios: 'https://apps.apple.com/app/id6753679575',
    android: 'https://play.google.com/store/apps/details?id=com.marte.marte',
    /** ერთი ხაზი ორივესთვის – მიმღები აირჩევს თავის პლატფორმას */
    both: 'iOS: https://apps.apple.com/app/id6753679575\nAndroid: https://play.google.com/store/apps/details?id=com.marte.marte',
  };

  const loadPhones = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiGetJson<{ success: boolean; data: PhoneUser[]; count?: number } | PhoneUser[]>(
        `/users/phones?loginAfter=${encodeURIComponent(LOGIN_AFTER)}`
      );
      const data = Array.isArray(res) ? res : (res.data || []);
      setPhones(data);
    } catch (e: any) {
      console.error('Error loading phones:', e);
      setError('ტელეფონების ჩატვირთვა ვერ მოხერხდა');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPhones();
    
    const onFocus = () => loadPhones();
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', onFocus);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', onFocus);
      }
    };
  }, [loadPhones]);

  const filteredPhones = phones.filter((p) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      p.phone?.toLowerCase().includes(search) ||
      p.firstName?.toLowerCase().includes(search) ||
      p.lastName?.toLowerCase().includes(search) ||
      p.email?.toLowerCase().includes(search)
    );
  });

  const toggleSelectPhone = (phone: string) => {
    const newSelected = new Set(selectedPhones);
    if (newSelected.has(phone)) {
      newSelected.delete(phone);
    } else {
      newSelected.add(phone);
    }
    setSelectedPhones(newSelected);
  };

  const selectAll = () => {
    if (selectedPhones.size === filteredPhones.length) {
      setSelectedPhones(new Set());
    } else {
      setSelectedPhones(new Set(filteredPhones.map(p => p.phone)));
    }
  };

  const sendSMS = async (targetPhones: string[] = []) => {
    if (!message.trim()) {
      alert('გთხოვთ შეიყვანოთ შეტყობინება');
      return;
    }

    const phonesToSend = targetPhones.length > 0 ? targetPhones : Array.from(selectedPhones);
    
    // თუ არჩეულია "გაგზავნა ყველას" და არ არის phoneNumbers, backend-იდან აიღებს
    const useBackendFilter = targetPhones.length === 0 && selectedPhones.size === 0;

    if (!useBackendFilter && phonesToSend.length === 0) {
      alert('გთხოვთ აირჩიოთ მიმღებები');
      return;
    }

    const countText = useBackendFilter 
      ? 'ყველა მომხმარებელს (ბაზიდან)' 
      : `${phonesToSend.length} მიმღებს`;
    
    if (!confirm(`ნამდვილად გსურთ გაგზავნა ${countText} SMS?`)) {
      return;
    }

    setSending(true);
    try {
      const trimmedMessage = message.trim();
      
      if (!trimmedMessage) {
        alert('გთხოვთ შეიყვანოთ შეტყობინება');
        setSending(false);
        return;
      }

      const requestBody: {
        message: string;
        phoneNumbers?: string[];
        role?: string;
        active?: boolean;
        smsno: number;
      } = {
        message: trimmedMessage,
        smsno: smsType,
      };

      // თუ არის არჩეული ტელეფონები, გამოვიყენოთ phoneNumbers
      if (!useBackendFilter && phonesToSend.length > 0) {
        requestBody.phoneNumbers = phonesToSend;
      }

      // დავამატოთ ფილტრები თუ არის
      if (role) {
        requestBody.role = role;
      }
      if (activeOnly) {
        requestBody.active = true;
      }

      // Debug: ვნახოთ რა იგზავნება
      console.log('SMS Request Body:', JSON.stringify(requestBody, null, 2));
      console.log('Message to send:', trimmedMessage);
      console.log('Message length:', trimmedMessage.length);

      // Backend-მა უნდა გამოიყენოს sender.ge API:
      // POST https://sender.ge/api/send.php
      // Content-Type: application/x-www-form-urlencoded
      // Parameters:
      //   - apikey: API key
      //   - smsno: 1 (რეკლამა) ან 2 (ინფორმაციული)
      //   - destination: 9-ნიშნა ტელეფონი (+995-ის გარეშე)
      //   - content: SMS შინაარსი (message ველი)

      const response = await fetch(`${API_BASE}/sms/bulk-send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('SMS Response:', JSON.stringify(result, null, 2));
      
      // Response structure: { total, success, failed, errors, successMessages }
      const sentCount = result.success || result.total || 0;
      const failedCount = result.failed || 0;
      
      // Save campaign
      const newCampaign: Campaign = {
        id: Date.now().toString(),
        name: campaignName || `SMS კამპანია ${new Date().toLocaleString('ka-GE')}`,
        message: trimmedMessage,
        sentTo: sentCount,
        createdAt: new Date().toISOString(),
        status: failedCount > 0 ? 'failed' : 'sent',
      };
      setCampaigns(prev => [newCampaign, ...prev]);

      let alertMessage = `✅ წარმატებით გაიგზავნა ${sentCount} SMS!`;
      if (failedCount > 0) {
        alertMessage += `\n❌ ვერ გაიგზავნა: ${failedCount}`;
      }
      if (result.errors && result.errors.length > 0) {
        alertMessage += `\n\nშეცდომები:\n${result.errors.join('\n')}`;
      }
      alert(alertMessage);
      setMessage('');
      setCampaignName('');
      setSelectedPhones(new Set());
      setShowCampaignModal(false);
    } catch (e: any) {
      console.error('Error sending SMS:', e);
      alert(`❌ შეცდომა: ${e.message || 'SMS-ის გაგზავნა ვერ მოხერხდა'}`);
    } finally {
      setSending(false);
    }
  };

  const sendToAll = () => {
    // გაგზავნა ყველას - backend-იდან აიღებს ტელეფონებს ფილტრების მიხედვით
    sendSMS([]);
  };

  const sendToSelected = () => {
    sendSMS();
  };

  const stats = {
    total: phones.length,
    selected: selectedPhones.size,
    filtered: filteredPhones.length,
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">📱 SMS მარკეტინგი</h1>
        <p className="text-gray-600">გაგზავნეთ SMS შეტყობინებები იუზერებს</p>
        <p className="text-sm text-amber-700 mt-1">ნაჩვენებია მხოლოდ იუზერები, რომლებსაც ჰქონდათ შესვლა 28 დეკემბერი 2025-ის შემდეგ</p>
      </div>

      {/* სტატისტიკა */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="text-sm text-gray-500">სულ ტელეფონი</div>
          <div className="text-2xl font-bold">{stats.total}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="text-sm text-gray-500">ფილტრირებული</div>
          <div className="text-2xl font-bold text-blue-600">{stats.filtered}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="text-sm text-gray-500">არჩეული</div>
          <div className="text-2xl font-bold text-green-600">{stats.selected}</div>
        </div>
      </div>

      {/* SMS გაგზავნის ფორმა */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6 border">
        <h2 className="text-xl font-semibold mb-4">ახალი SMS კამპანია</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              კამპანიის სახელი (არასავალდებულო)
            </label>
            <input
              type="text"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="მაგ: ახალი წლის შეთავაზება"
              className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              შეტყობინება *
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              <span className="text-sm text-gray-600">აპის ლინკი (დაჭერისას გახსნის აპს ან სტორს):</span>
              <button
                type="button"
                onClick={() => setMessage((m) => (m ? `${m}\n\nჩამოტვირთე Marte:\n${APP_LINKS.both}` : `ჩამოტვირთე Marte:\n${APP_LINKS.both}`))}
                className="text-sm px-3 py-1.5 bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200 border border-amber-300"
              >
                ჩასვი iOS + Android
              </button>
              <button
                type="button"
                onClick={() => setMessage((m) => (m ? `${m}\n\n${APP_LINKS.ios}` : `ჩამოტვირთე Marte (iOS): ${APP_LINKS.ios}`))}
                className="text-sm px-3 py-1.5 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 border border-gray-300"
              >
                მხოლოდ iOS
              </button>
              <button
                type="button"
                onClick={() => setMessage((m) => (m ? `${m}\n\n${APP_LINKS.android}` : `ჩამოტვირთე Marte (Android): ${APP_LINKS.android}`))}
                className="text-sm px-3 py-1.5 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 border border-green-300"
              >
                მხოლოდ Android
              </button>
            </div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="შეიყვანეთ SMS შეტყობინება..."
              rows={4}
              maxLength={480}
              className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="text-sm text-gray-500 mt-1">
              {message.length} / 480 სიმბოლო (უფრო გრძელი SMS გაიგზავნება რამდენიმე ნაწილად)
            </div>
          </div>

          {/* ფილტრები */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                როლი (არასავალდებულო)
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">ყველა</option>
                <option value="customer">customer</option>
                <option value="owner">owner</option>
                <option value="manager">manager</option>
                <option value="employee">employee</option>
                <option value="user">user</option>
                <option value="partner">პარტნიორი</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SMS ტიპი
              </label>
              <select
                value={smsType}
                onChange={(e) => setSmsType(Number(e.target.value) as 1 | 2)}
                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={1}>რეკლამა</option>
                <option value={2}>ინფორმაციული</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={activeOnly}
                  onChange={(e) => setActiveOnly(e.target.checked)}
                  className="rounded"
                />
                მხოლოდ აქტიური მომხმარებლები
              </label>
            </div>
          </div>

          <div className="flex gap-3 flex-wrap">
            <button
              onClick={sendToSelected}
              disabled={sending || selectedPhones.size === 0 || !message.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {sending ? 'გაგზავნა...' : `📤 გაგზავნა არჩეულებს (${selectedPhones.size})`}
            </button>
            <button
              onClick={sendToAll}
              disabled={sending || !message.trim()}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {sending ? 'გაგზავნა...' : `📢 გაგზავნა ყველას (ბაზიდან)`}
            </button>
          </div>
        </div>
      </div>

      {/* ძიება და ფილტრები */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="ძიება ტელეფონის, სახელის, ელფოსტის მიხედვით..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* ტელეფონების სია */}
      {loading ? (
        <div className="text-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
          <div className="text-gray-500">იტვირთება...</div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden border">
          <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={selectAll}
                className="text-sm text-blue-600 hover:underline"
              >
                {selectedPhones.size === filteredPhones.length ? 'გაუქმება' : 'ყველას არჩევა'}
              </button>
              <span className="text-sm text-gray-600">
                {filteredPhones.length} ტელეფონი
              </span>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left w-12">
                    <input
                      type="checkbox"
                      checked={selectedPhones.size === filteredPhones.length && filteredPhones.length > 0}
                      onChange={selectAll}
                      className="rounded"
                    />
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">ტელეფონი</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">სახელი</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">ელფოსტა</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">User ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredPhones.map((phoneUser, idx) => (
                  <tr
                    key={phoneUser.phone || idx}
                    className={`hover:bg-gray-50 ${
                      selectedPhones.has(phoneUser.phone) ? 'bg-blue-50' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedPhones.has(phoneUser.phone)}
                        onChange={() => toggleSelectPhone(phoneUser.phone)}
                        className="rounded"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={`tel:${phoneUser.phone}`}
                        className="text-blue-600 hover:underline font-medium"
                      >
                        {phoneUser.phone}
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      {phoneUser.firstName || phoneUser.lastName
                        ? `${phoneUser.firstName || ''} ${phoneUser.lastName || ''}`.trim()
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {phoneUser.email ? (
                        <a
                          href={`mailto:${phoneUser.email}`}
                          className="text-blue-600 hover:underline"
                        >
                          {phoneUser.email}
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {phoneUser.userId ? (
                        <a
                          href={`/users/${phoneUser.userId}`}
                          className="text-blue-600 hover:underline font-mono text-xs"
                        >
                          {phoneUser.userId.substring(0, 20)}...
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredPhones.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              ტელეფონები ვერ მოიძებნა
            </div>
          )}
        </div>
      )}

      {/* კამპანიების ისტორია */}
      {campaigns.length > 0 && (
        <div className="mt-6 bg-white rounded-lg shadow-md p-6 border">
          <h2 className="text-xl font-semibold mb-4">კამპანიების ისტორია</h2>
          <div className="space-y-2">
            {campaigns.map((campaign) => (
              <div
                key={campaign.id}
                className="border rounded-lg p-4 hover:bg-gray-50"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-semibold">{campaign.name || 'უსახელო კამპანია'}</div>
                    <div className="text-sm text-gray-600 mt-1">{campaign.message}</div>
                    <div className="text-xs text-gray-500 mt-2">
                      გაიგზავნა: {new Date(campaign.createdAt).toLocaleString('ka-GE')} | 
                      მიმღებები: {campaign.sentTo}
                    </div>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      campaign.status === 'sent'
                        ? 'bg-green-100 text-green-800'
                        : campaign.status === 'failed'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {campaign.status === 'sent' ? 'გაგზავნილი' : campaign.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

