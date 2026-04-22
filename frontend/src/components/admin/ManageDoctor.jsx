import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "../common/DashboardLayout";
import { useAuth } from "../../context/AuthenticationContext";
import { getAllDoctors, createDoctor, toggleUserStatus } from "../../api/adminApi";
import { ADMIN_LINKS } from "./adminLinks";

export default function ManageDoctor() {
  const { token } = useAuth();
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "", email: "", password: "", phoneNumber: "",
    specialty: "", licenseNumber: "", experience: "", consultationFee: ""
  });
  const [addLoading, setAddLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [actionError, setActionError] = useState(null);

  const fetchDoctors = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAllDoctors(token);
      setDoctors(data);
    } catch (e) {
      console.error("Failed to load doctors", e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { if (token) fetchDoctors(); }, [token, fetchDoctors]);

  const handleAddDoctor = async (e) => {
    e.preventDefault();
    setAddLoading(true);
    setActionError(null);
    try {
      await createDoctor({
        ...addForm,
        consultationFee: addForm.consultationFee ? parseFloat(addForm.consultationFee) : null
      }, token);
      setShowAddForm(false);
      setAddForm({ name: "", email: "", password: "", phoneNumber: "", specialty: "", licenseNumber: "", experience: "", consultationFee: "" });
      fetchDoctors();
    } catch (err) {
      setActionError("Failed to create doctor: " + err.message);
    } finally {
      setAddLoading(false);
    }
  };

  const handleToggle = async (userId) => {
    try {
      await toggleUserStatus(userId, token);
      fetchDoctors();
    } catch (err) {
      setActionError("Failed to update status: " + err.message);
    }
  };

  return (
    <DashboardLayout title="Manage Doctors" links={ADMIN_LINKS}>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-gray-600">{doctors.length} doctor(s) registered</p>
        <button onClick={() => { setShowAddForm(!showAddForm); setActionError(null); }}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${showAddForm ? "bg-gray-100 text-gray-700" : "bg-primary-600 text-white hover:bg-primary-700"}`}>
          {showAddForm ? "Cancel" : "+ Add Doctor"}
        </button>
      </div>

      {actionError && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/></svg>
          {actionError}
          <button onClick={() => setActionError(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* Add Doctor Form */}
      {showAddForm && (
        <form onSubmit={handleAddDoctor} className="rounded-2xl bg-white p-6 shadow-sm mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Add New Doctor</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Full Name *</span>
              <input type="text" required value={addForm.name}
                onChange={e => setAddForm({...addForm, name: e.target.value})}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Email *</span>
              <input type="email" required value={addForm.email}
                onChange={e => setAddForm({...addForm, email: e.target.value})}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Password *</span>
              <input type="password" required value={addForm.password}
                onChange={e => setAddForm({...addForm, password: e.target.value})}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Phone Number</span>
              <input type="tel" value={addForm.phoneNumber}
                onChange={e => setAddForm({...addForm, phoneNumber: e.target.value})}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Specialty *</span>
              <input type="text" required value={addForm.specialty}
                onChange={e => setAddForm({...addForm, specialty: e.target.value})}
                placeholder="e.g., Cardiology"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">License Number</span>
              <input type="text" value={addForm.licenseNumber}
                onChange={e => setAddForm({...addForm, licenseNumber: e.target.value})}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Experience</span>
              <input type="text" value={addForm.experience}
                onChange={e => setAddForm({...addForm, experience: e.target.value})}
                placeholder="e.g., 10 years"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Consultation Fee</span>
              <input type="number" step="0.01" value={addForm.consultationFee}
                onChange={e => setAddForm({...addForm, consultationFee: e.target.value})}
                placeholder="e.g., 100"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </label>
          </div>
          <button type="submit" disabled={addLoading}
            className="mt-4 rounded-lg bg-primary-600 px-6 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50">
            {addLoading ? "Creating..." : "Create Doctor Account"}
          </button>
        </form>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading doctors...</div>
      ) : doctors.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No doctors registered yet.</div>
      ) : (
        <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-6 py-3 font-medium text-gray-500">Doctor</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Phone</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Specialty</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Experience</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Rating</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Status</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {doctors.map(doc => (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 overflow-hidden rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-sm">
                          {doc.profileImageUrl || doc.imageUrl ? (
                            <img src={doc.profileImageUrl || doc.imageUrl} alt={doc.name} className="h-full w-full object-cover" />
                          ) : (
                            (doc.name || "D")[0]
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{doc.name}</div>
                          <div className="text-xs text-gray-500">{doc.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-700">{doc.phoneNumber || "—"}</td>
                    <td className="px-6 py-4 text-gray-700">{doc.specialty || "—"}</td>
                    <td className="px-6 py-4 text-gray-700">{doc.experience || 0} yrs</td>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-1">
                        <svg className="h-4 w-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                        {doc.rating ? doc.rating.toFixed(1) : "N/A"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {doc.isActive === false ? (
                        <span className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-red-100 text-red-700">Deactivated</span>
                      ) : doc.availability === "Verified" ? (
                        <span className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-50 text-green-700">Active</span>
                      ) : (
                        <span className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-yellow-50 text-yellow-700">Active</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1.5">
                        <button onClick={() => setSelected(doc)}
                          className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200">View</button>
                        <button onClick={() => handleToggle(doc.userId)}
                          className={`rounded px-2 py-1 text-xs font-medium ${doc.isActive === false ? "bg-green-50 text-green-700 hover:bg-green-100" : "bg-yellow-50 text-yellow-700 hover:bg-yellow-100"}`}>
                          {doc.isActive === false ? "Activate" : "Deactivate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setSelected(null)}>
          <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Doctor Details</h3>
            <dl className="space-y-2 text-sm">
              {[
                ["Name", selected.name],
                ["Email", selected.email],
                ["Phone", selected.phoneNumber],
                ["Specialty", selected.specialty],
                ["Experience", selected.experience ? selected.experience + " yrs" : "—"],
                ["License No.", selected.licenseNumber],
                ["Consultation Fee", selected.consultationFee != null ? "৳" + selected.consultationFee : "—"],
                ["Rating", selected.rating ? selected.rating.toFixed(1) + " / 5" : "N/A"],
                ["Status", selected.isActive === false ? "Deactivated" : selected.availability === "Verified" ? "Active" : "Active"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <dt className="text-gray-500">{k}</dt>
                  <dd className="font-medium text-right">{v || "—"}</dd>
                </div>
              ))}
            </dl>
            <button onClick={() => setSelected(null)} className="mt-4 w-full rounded-lg bg-gray-100 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">Close</button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
