"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";

const REMINDER_TYPES = [
  { id: 'service', name: 'სერვისი' },
  { id: 'oil', name: 'ზეთის შეცვლა' },
  { id: 'tires', name: 'ტირეების შემოწმება' },
  { id: 'battery', name: 'ბატარეის შემოწმება' },
  { id: 'insurance', name: 'დაზღვევა' },
  { id: 'inspection', name: 'ტექდათვალიერება' },
];

type Offer = {
  id?: string;
  reqId?: string;
  providerName: string;
  priceGEL: number;
  etaMin?: number;
  distanceKm?: number;
  tags?: string[];
  partnerId?: string;
  userId?: string;
  status?: string;
  reminderType?: string;
};

export default function RemindersOffersAdminPage() {
  const [selectedReminderType, setSelectedReminderType] = useState<string>("service");
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);

  const [formData, setFormData] = useState<Omit<Offer, "id">>({
    providerName: "",
    priceGEL: 0,
    etaMin: undefined,
    distanceKm: undefined,
    tags: [],
    partnerId: "",
    userId: "admin",
    status: "pending",
    reminderType: "service",
  });

  useEffect(() => {
    if (selectedReminderType) {
      loadOffers(selectedReminderType);
    }
  }, [selectedReminderType]);

  const loadOffers = async (reminderType: string) => {
    setLoading(true);
    setError("");
    try {
      const data = await apiGet<Offer[]>(`/offers?reminderType=${reminderType}`);
      setOffers(data || []);
    } catch (err: unknown) {
      const message = err && typeof err === "object" && "message" in err ? String((err as { message?: string }).message) : "შეცდომა შეთავაზებების ჩატვირთვისას";
      setError(message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReminderType) {
      setError("გთხოვთ აირჩიოთ reminder type");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const payload = {
        ...formData,
        reminderType: selectedReminderType,
        userId: formData.userId || "admin",
        partnerId: formData.partnerId || formData.userId || "admin",
        reqId: `reminder-type-${selectedReminderType}`, // Generic reqId for type-based offers
      };

      if (editingOffer?.id) {
        await apiPatch(`/offers/${editingOffer.id}`, payload);
      } else {
        await apiPost("/offers", payload);
      }

      await loadOffers(selectedReminderType);
      resetForm();
    } catch (err: unknown) {
      const message = err && typeof err === "object" && "message" in err ? String((err as { message?: string }).message) : "შეცდომა შეთავაზების შენახვისას";
      setError(message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (offerId: string) => {
    if (!confirm("დარწმუნებული ხართ რომ გსურთ ამ შეთავაზების წაშლა?")) {
      return;
    }

    setLoading(true);
    try {
      await apiDelete(`/offers/${offerId}`);
      await loadOffers(selectedReminderType);
    } catch (err: unknown) {
      const message = err && typeof err === "object" && "message" in err ? String((err as { message?: string }).message) : "შეცდომა შეთავაზების წაშლისას";
      setError(message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (offer: Offer) => {
    setEditingOffer(offer);
    setFormData({
      providerName: offer.providerName,
      priceGEL: offer.priceGEL,
      etaMin: offer.etaMin,
      distanceKm: offer.distanceKm,
      tags: offer.tags || [],
      partnerId: offer.partnerId || "",
      userId: offer.userId || "admin",
      status: offer.status || "pending",
      reminderType: offer.reminderType || selectedReminderType,
      reqId: offer.reqId,
    });
    setShowAddForm(true);
  };

  const resetForm = () => {
    setFormData({
      providerName: "",
      priceGEL: 0,
      etaMin: undefined,
      distanceKm: undefined,
      tags: [],
      partnerId: "",
      userId: "admin",
      status: "pending",
      reminderType: selectedReminderType,
      reqId: `reminder-type-${selectedReminderType}`,
    });
    setEditingOffer(null);
    setShowAddForm(false);
  };

  const selectedTypeName = REMINDER_TYPES.find(t => t.id === selectedReminderType)?.name || selectedReminderType;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">შეთავაზებების მართვა Reminder Type-ების მიხედვით</h1>
        <p className="text-sm text-gray-500">აირჩიეთ reminder type და დაამატეთ/რედაქტირეთ შეთავაზებები</p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
          {error}
        </div>
      )}

      {/* Reminder Type Selection */}
      <div className="border rounded-md p-4">
        <label className="block text-sm font-medium mb-2">აირჩიეთ Reminder Type:</label>
        <div className="grid grid-cols-3 gap-3">
          {REMINDER_TYPES.map((type) => (
            <button
              key={type.id}
              onClick={() => {
                setSelectedReminderType(type.id);
                resetForm();
              }}
              className={`px-4 py-3 rounded-md border transition-colors ${
                selectedReminderType === type.id
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}
            >
              {type.name}
            </button>
          ))}
        </div>
        {selectedReminderType && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm font-medium text-blue-900">
              არჩეული: <strong>{selectedTypeName}</strong>
            </p>
            <p className="text-xs text-blue-700 mt-1">
              ამ type-ის შეთავაზებები გამოჩნდება ყველა user-ისთვის, რომელსაც აქვს {selectedTypeName} reminder
            </p>
          </div>
        )}
      </div>

      {/* Add/Edit Form */}
      {selectedReminderType && (
        <div className="border rounded-md p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium">
              {editingOffer ? "შეთავაზების რედაქტირება" : `ახალი შეთავაზების დამატება - ${selectedTypeName}`}
            </h2>
            {!showAddForm && (
              <button
                onClick={() => setShowAddForm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                + დამატება
              </button>
            )}
          </div>

          {showAddForm && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    მომწოდებლის სახელი *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.providerName}
                    onChange={(e) =>
                      setFormData({ ...formData, providerName: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="მაგ: AutoService Pro"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    ფასი (₾) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.priceGEL}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        priceGEL: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    ETA (წუთები)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.etaMin || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        etaMin: e.target.value ? parseInt(e.target.value) : undefined,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="მაგ: 30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    მანძილი (კმ)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={formData.distanceKm || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        distanceKm: e.target.value ? parseFloat(e.target.value) : undefined,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="მაგ: 2.5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Partner ID
                  </label>
                  <input
                    type="text"
                    value={formData.partnerId}
                    onChange={(e) =>
                      setFormData({ ...formData, partnerId: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="partner-user-id"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">
                    Tags (გამოყოფილი მძიმით)
                  </label>
                  <input
                    type="text"
                    value={formData.tags?.join(", ") || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        tags: e.target.value
                          .split(",")
                          .map((t) => t.trim())
                          .filter(Boolean),
                      })
                    }
                    placeholder="Premium, Express, Fast"
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? "ინახება..." : editingOffer ? "განახლება" : "დამატება"}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  გაუქმება
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Offers List */}
      {selectedReminderType && (
        <div className="border rounded-md overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b">
            <h2 className="text-lg font-medium">
              {selectedTypeName} - შეთავაზებები ({offers.length})
            </h2>
          </div>
          {loading && !offers.length ? (
            <div className="p-6 text-center text-gray-500">იტვირთება...</div>
          ) : offers.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              არ არის შეთავაზებები ამ type-ისთვის. დაამატეთ პირველი შეთავაზება!
            </div>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">მომწოდებელი</th>
                  <th className="px-4 py-2 text-left">ფასი</th>
                  <th className="px-4 py-2 text-left">ETA</th>
                  <th className="px-4 py-2 text-left">მანძილი</th>
                  <th className="px-4 py-2 text-left">Tags</th>
                  <th className="px-4 py-2 text-left">სტატუსი</th>
                  <th className="px-4 py-2 text-left">მოქმედებები</th>
                </tr>
              </thead>
              <tbody>
                {offers.map((offer) => (
                  <tr key={offer.id} className="border-t">
                    <td className="px-4 py-2 font-medium">{offer.providerName}</td>
                    <td className="px-4 py-2">{offer.priceGEL}₾</td>
                    <td className="px-4 py-2">{offer.etaMin ? `${offer.etaMin} წთ` : "-"}</td>
                    <td className="px-4 py-2">
                      {offer.distanceKm ? `${offer.distanceKm.toFixed(1)} კმ` : "-"}
                    </td>
                    <td className="px-4 py-2">
                      {offer.tags?.length ? (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {offer.tags.join(", ")}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          offer.status === "accepted"
                            ? "bg-green-100 text-green-800"
                            : offer.status === "rejected"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {offer.status || "pending"}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(offer)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          რედაქტირება
                        </button>
                        <button
                          onClick={() => offer.id && handleDelete(offer.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          წაშლა
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
