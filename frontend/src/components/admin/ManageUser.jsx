import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "../common/DashboardLayout";
import { useAuth } from "../../context/AuthenticationContext";
import { getUsersByRole, toggleUserStatus, deleteUser } from "../../api/adminApi";
import { ADMIN_LINKS } from "./adminLinks";

export default function ManageUser() {
  const { token } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [actionError, setActionError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getUsersByRole("PATIENT", token);
      setUsers(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { if (token) fetchUsers(); }, [token, fetchUsers]);

  const handleToggle = async (userId) => {
    setActionError("");
    try {
      await toggleUserStatus(userId, token);
      fetchUsers();
    } catch (err) {
      setActionError("Failed to update status: " + err.message);
    }
  };

  const handleDelete = async (userId) => {
    setActionError("");
    try {
      await deleteUser(userId, token);
      setConfirmDelete(null);
      fetchUsers();
    } catch (err) {
      setActionError("Failed to delete user: " + err.message);
      setConfirmDelete(null);
    }
  };

  const filtered = searchQuery
    ? users.filter(u => u.name?.toLowerCase().includes(searchQuery.toLowerCase()) || u.email?.toLowerCase().includes(searchQuery.toLowerCase()))
    : users;

  return (
    <DashboardLayout title="Manage Patients" links={ADMIN_LINKS}>
      {actionError && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/></svg>
          {actionError}
          <button onClick={() => setActionError("")} className="ml-auto text-red-400 hover:text-red-600">✕</button>
        </div>
      )}
      {/* Search */}
      <div className="rounded-xl bg-white p-4 shadow-sm mb-6 flex flex-col sm:flex-row gap-4 items-center">
        <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search by name or email..."
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        <span className="text-sm text-gray-500">{filtered.length} patient{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading users...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No users found.</div>
      ) : (
        <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-6 py-3 font-medium text-gray-500">Patient</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Phone</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Status</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-sm">
                          {(user.name || "?")[0]}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{user.name}</div>
                          <div className="text-xs text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-700">{user.phoneNumber || "—"}</td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${user.isActive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                        {user.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1.5">
                        <button onClick={() => setSelected(user)}
                          className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200">View</button>
                        <button onClick={() => handleToggle(user.id)}
                          className={`rounded px-2 py-1 text-xs font-medium ${user.isActive ? "bg-yellow-50 text-yellow-700 hover:bg-yellow-100" : "bg-green-50 text-green-700 hover:bg-green-100"}`}>
                          {user.isActive ? "Deactivate" : "Activate"}
                        </button>
                        {user.role !== "ADMIN" && (
                          <button onClick={() => setConfirmDelete(user)}
                            className="rounded bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100">Delete</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setConfirmDelete(null)}>
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mx-auto">
              <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </div>
            <h3 className="text-center text-lg font-bold text-gray-900 mb-2">Delete Patient?</h3>
            <p className="text-center text-sm text-gray-500 mb-6">
              This will permanently delete <span className="font-semibold text-gray-800">{confirmDelete.name}</span> and all their records. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={() => handleDelete(confirmDelete.id)} className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setSelected(null)}>
          <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-4">User Details</h3>
            <dl className="space-y-2 text-sm">
              {[
                ["Name", selected.name],
                ["Email", selected.email],
                ["Phone", selected.phoneNumber],
                ["Status", selected.isActive ? "Active" : "Inactive"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <dt className="text-gray-500">{k}</dt>
                  <dd className="font-medium">{v || "—"}</dd>
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
