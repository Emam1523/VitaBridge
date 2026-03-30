import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "../common/DashboardLayout";
import { useAuth } from "../../context/AuthenticationContext";
import { getAllAssistantAssignments, getUnassignedAssistants, toggleUserStatus, deleteUser } from "../../api/adminApi";
import { ADMIN_LINKS } from "./adminLinks";

export default function AssistantAssignments() {
  const { token } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [unassigned, setUnassigned] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUnassigned, setShowUnassigned] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionError, setActionError] = useState(null);

  const fetchAssignments = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAllAssistantAssignments(token);
      setAssignments(data);
    } catch (e) {
      console.error("Failed to load assignments", e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchUnassigned = useCallback(async () => {
    try {
      const data = await getUnassignedAssistants(token);
      setUnassigned(data);
    } catch (e) {
      console.error("Failed to load unassigned assistants", e);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchAssignments();
    }
  }, [token, fetchAssignments]);

  const handleShowUnassigned = () => {
    if (!showUnassigned && unassigned.length === 0) {
      fetchUnassigned();
    }
    setShowUnassigned(!showUnassigned);
  };

  const handleToggle = async (userId) => {
    try {
      await toggleUserStatus(userId, token);
      fetchAssignments();
      if (showUnassigned) fetchUnassigned();
    } catch (err) {
      setActionError("Failed to update status: " + err.message);
    }
  };

  const handleDelete = async (userId, name) => {
    if (!window.confirm(`Permanently delete assistant ${name}? This cannot be undone.`)) return;
    try {
      await deleteUser(userId, token);
      fetchAssignments();
      if (showUnassigned) fetchUnassigned();
    } catch (err) {
      setActionError("Failed to delete assistant: " + err.message);
    }
  };

  const assignedAssistants = assignments.filter(a => a.doctorId);
  const filteredAssignments = searchQuery
    ? assignedAssistants.filter(a =>
        a.assistantName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.doctorName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.employeeId?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : assignedAssistants;

  return (
    <DashboardLayout title="Assistant-Doctor Assignments" links={ADMIN_LINKS}>
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Total Assistants</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{assignments.length}</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Assigned</p>
          <p className="mt-1 text-2xl font-bold text-green-600">{assignedAssistants.length}</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Unassigned</p>
          <p className="mt-1 text-2xl font-bold text-yellow-600">
            {assignments.length - assignedAssistants.length}
          </p>
        </div>
      </div>

      {actionError && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/></svg>
          {actionError}
          <button onClick={() => setActionError(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={handleShowUnassigned}
          className="rounded-lg px-4 py-2 text-sm font-medium bg-primary-600 text-white hover:bg-primary-700"
        >
          {showUnassigned ? "Hide" : "Show"} Unassigned Assistants
        </button>
        <button
          onClick={fetchAssignments}
          className="rounded-lg px-4 py-2 text-sm font-medium bg-gray-600 text-white hover:bg-gray-700"
        >
          Refresh
        </button>
      </div>

      {/* Unassigned Assistants */}
      {showUnassigned && (
        <div className="rounded-xl bg-white p-4 shadow-sm mb-6">
          <h3 className="font-bold text-gray-900 mb-4">Unassigned Assistants</h3>
          {unassigned.length === 0 ? (
            <p className="text-gray-500">All assistants are assigned to doctors.</p>
          ) : (
            <div className="space-y-2">
              {unassigned.map(asst => (
                <div
                  key={asst.assistantId}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50"
                >
                  <div>
                    <div className="font-medium text-gray-900">{asst.assistantName}</div>
                    <div className="text-sm text-gray-500">
                      {asst.assistantEmail} • Employee ID: {asst.employeeId || "N/A"}
                    </div>
                  </div>
                  <span className="rounded-full px-3 py-1 text-xs font-medium bg-yellow-50 text-yellow-700">
                    Unassigned
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Search */}
      <div className="rounded-xl bg-white p-4 shadow-sm mb-6">
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search by assistant name, doctor name, or employee ID..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      {/* Assignments Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading assignments...</div>
      ) : filteredAssignments.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No assignments found.</div>
      ) : (
        <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-6 py-3 font-medium text-gray-500">Assistant</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Employee ID</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Contact</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Assigned Doctor</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Specialty</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Status</th>
                  <th className="px-6 py-3 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredAssignments.map(asst => (
                  <tr key={asst.assistantId} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-sm">
                          {(asst.assistantName || "A")[0]}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{asst.assistantName}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-700">{asst.employeeId || "—"}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div className="text-gray-700">{asst.assistantEmail}</div>
                        <div className="text-gray-500">{asst.assistantPhone || "—"}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-xs">
                          {(asst.doctorName || "D")[0]}
                        </div>
                        <span className="font-medium text-gray-900">{asst.doctorName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-700">{asst.doctorSpecialty || "—"}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          asst.isActive
                            ? "bg-green-50 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {asst.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1.5">
                        <button onClick={() => handleToggle(asst.userId)}
                          className={`rounded px-2 py-1 text-xs font-medium ${asst.isActive ? "bg-yellow-50 text-yellow-700 hover:bg-yellow-100" : "bg-green-50 text-green-700 hover:bg-green-100"}`}>
                          {asst.isActive ? "Deactivate" : "Activate"}
                        </button>
                        <button onClick={() => handleDelete(asst.userId, asst.assistantName)}
                          className="rounded bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
