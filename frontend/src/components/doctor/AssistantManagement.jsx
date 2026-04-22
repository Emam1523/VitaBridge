import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "../common/DashboardLayout";
import { useAuth } from "../../context/AuthenticationContext";
import { getMyAssistants, createAssistant, removeAssistant, updateAssistantStatus } from "../../api/doctorApi";
import { DOCTOR_LINKS } from "./DoctorDashboard";

export default function AssistantManagement() {
  const { token } = useAuth();
  const [assistants, setAssistants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", email: "", password: "", phoneNumber: "", employeeId: "" });
  const [addLoading, setAddLoading] = useState(false);

  const fetchAssistants = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getMyAssistants(token);
      setAssistants(data);
    } catch (e) {
      console.error("Failed to load assistants", e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { if (token) fetchAssistants(); }, [token, fetchAssistants]);

  const handleAddAssistant = async (e) => {
    e.preventDefault();
    setAddLoading(true);
    try {
      await createAssistant(addForm, token);
      setShowAddForm(false);
      setAddForm({ name: "", email: "", password: "", phoneNumber: "", employeeId: "" });
      fetchAssistants();
    } catch (err) {
      alert("Failed to create assistant: " + err.message);
    } finally {
      setAddLoading(false);
    }
  };

  const handleRemove = async (userId) => {
    if (!confirm("Remove this assistant?")) return;
    try {
      await removeAssistant(userId, token);
      fetchAssistants();
    } catch (err) {
      alert("Failed: " + err.message);
    }
  };

  const handleToggleStatus = async (userId, nextActive) => {
    const action = nextActive ? "activate" : "deactivate";
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} this assistant?`)) return;
    try {
      await updateAssistantStatus(userId, nextActive, token);
      fetchAssistants();
    } catch (err) {
      alert(`Failed to ${action} assistant: ${err.message}`);
    }
  };

  return (
    <DashboardLayout title="My Assistants" links={DOCTOR_LINKS}>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-gray-600">{assistants.length} assistant(s) assigned to you</p>
        <button onClick={() => setShowAddForm(!showAddForm)}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${showAddForm ? "bg-gray-100 text-gray-700" : "bg-primary-600 text-white hover:bg-primary-700"}`}>
          {showAddForm ? "Cancel" : "+ Add Assistant"}
        </button>
      </div>

      {/* Add Assistant Form */}
      {showAddForm && (
        <form onSubmit={handleAddAssistant} className="rounded-2xl bg-white p-6 shadow-sm mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Add New Assistant</h3>
          <p className="text-sm text-gray-600 mb-4">Create an assistant account. They will be automatically assigned to you.</p>
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
            <label className="block sm:col-span-2">
              <span className="text-sm font-medium text-gray-700">Employee ID</span>
              <input type="text" value={addForm.employeeId}
                onChange={e => setAddForm({...addForm, employeeId: e.target.value})}
                placeholder="Optional"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </label>
          </div>
          <button type="submit" disabled={addLoading}
            className="mt-4 rounded-lg bg-primary-600 px-6 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50">
            {addLoading ? "Creating..." : "Create Assistant Account"}
          </button>
        </form>
      )}

      {/* Assistant List */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading assistants...</div>
      ) : assistants.length === 0 ? (
        <div className="rounded-2xl bg-white p-12 shadow-sm text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m3 5.197V21" />
          </svg>
          <p className="mt-4 text-gray-500">No assistants assigned yet. Click "+ Add Assistant" to create one.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {assistants.map(ast => (
            <div key={ast.id} className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 overflow-hidden rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold">
                    {ast.profileImageUrl ? (
                      <img src={ast.profileImageUrl} alt={ast.name || "Assistant"} className="h-full w-full object-cover" />
                    ) : (
                      <span>{(ast.name || "A")[0]}</span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{ast.name}</h3>
                    <p className="text-xs text-gray-500">{ast.email}</p>
                  </div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ast.isActive ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                  {ast.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="space-y-1 text-sm">
                {ast.phoneNumber && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Phone</span>
                    <span className="text-gray-900">{ast.phoneNumber}</span>
                  </div>
                )}
                {ast.employeeId && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Employee ID</span>
                    <span className="text-gray-900">{ast.employeeId}</span>
                  </div>
                )}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleToggleStatus(ast.userId, !ast.isActive)}
                  className={`rounded-lg py-2 text-sm font-medium ${ast.isActive ? "bg-amber-50 text-amber-700 hover:bg-amber-100" : "bg-green-50 text-green-700 hover:bg-green-100"}`}
                >
                  {ast.isActive ? "Deactivate" : "Activate"}
                </button>
                <button onClick={() => handleRemove(ast.userId)}
                  className="rounded-lg bg-red-50 py-2 text-sm font-medium text-red-700 hover:bg-red-100">
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}

