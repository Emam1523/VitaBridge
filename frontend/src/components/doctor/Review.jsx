import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "../common/DashboardLayout";
import { useAuth } from "../../context/AuthenticationContext";
import { getDoctorProfile } from "../../api/doctorApi";
import { apiRequest } from "../../api/httpClient";
import { DOCTOR_LINKS } from "./DoctorDashboard";

export default function Review() {
  const { token } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const doc = await getDoctorProfile(token);
      setProfile(doc);
      // Fetch reviews for this doctor via public endpoint
      const revs = await apiRequest(`/doctors/${doc.id}/reviews`);
      setReviews(revs || []);
    } catch (e) {
      console.error(e);
      // If /doctors/{id}/reviews doesn't exist, just set empty
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const avgRating = profile?.rating || (reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) : 0);

  return (
    <DashboardLayout title="Patient Reviews" links={DOCTOR_LINKS}>
      {/* Summary */}
      <div className="rounded-2xl bg-white p-6 shadow-sm mb-6">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="text-center">
            <div className="text-4xl font-bold text-gray-900">{avgRating ? avgRating.toFixed(1) : "N/A"}</div>
            <div className="flex justify-center mt-1">
              {[1, 2, 3, 4, 5].map(star => (
                <svg key={star} className={`h-5 w-5 ${star <= Math.round(avgRating) ? "text-yellow-400" : "text-gray-200"}`} fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <p className="mt-1 text-sm text-gray-500">{profile?.totalReviews || reviews.length} reviews</p>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">Your Rating Overview</h3>
            <p className="text-sm text-gray-500 mt-1">Feedback from your patients helps improve the quality of care.</p>
          </div>
        </div>
      </div>

      {/* Reviews List */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading reviews...</div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No reviews yet.</p>
          <p className="text-sm text-gray-400 mt-1">Reviews will appear here once patients provide feedback.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map(review => (
            <div key={review.id} className="rounded-xl bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold">
                    {(review.patientName || "P")[0]}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{review.patientName || "Patient"}</h4>
                    <p className="text-xs text-gray-500">{review.createdAt ? new Date(review.createdAt).toLocaleDateString() : ""}</p>
                  </div>
                </div>
                <div className="flex">
                  {[1, 2, 3, 4, 5].map(star => (
                    <svg key={star} className={`h-4 w-4 ${star <= review.rating ? "text-yellow-400" : "text-gray-200"}`} fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
              </div>
              {review.comment && <p className="mt-3 text-sm text-gray-600">{review.comment}</p>}
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}

