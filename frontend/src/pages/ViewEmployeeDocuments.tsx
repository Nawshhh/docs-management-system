import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";

type Review = {
    reviewer_id: string | null;
    comment?: string | null;
    decided_at?: number | null;
}

type Document = {
  id?: string;
  _id?: string;
  title?: string;
  owner_id?: string;
  status?: string;
  description?: string;
  review?: Review | null;
  created_at?: string;
  updated_at?: string;
};

function ViewEmployeeDocuments() {
    const navigate = useNavigate();
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);

    const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [employeeId, setEmployeeId] = useState<string | null>(null);

    const handleBack = () => {
        navigate("/employee-homepage");
    };

    const formatDate = (value?: string) => {
        if (!value) return "-";
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return value;
        return d.toLocaleString("en-PH", { timeZone: "Asia/Manila" });
    };

    const openModal = (doc: Document) => {
        setSelectedDoc(doc);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setSelectedDoc(null);
        setIsModalOpen(false);
    };

    const fetchUserInfo = async () => {
        try {
            const res = await axios.get("http://localhost:8000/auth/me", {
                withCredentials: true,
            });

             

            const { ok, data, error } = res.data;

            setEmployeeId(data.id);

            if (!ok || !data) {
              await axios.post("http://localhost:8000/auth/page-breach", { page: "EMPLOYEE" });
                toast.error(error || "Unable to verify permissions.", {
                style: {
                    background: "#393939",
                    color: "#FFFFFF",
                },
                });
                navigate("/");
                return;
            }

            const userData = data;

            if (userData.role !== "EMPLOYEE") {
              await axios.post("http://localhost:8000/auth/page-breach", { page: "EMPLOYEE" });
                toast.error("Access denied. Employee only.", {
                style: {
                    background: "#393939",
                    color: "#FFFFFF",
                },
                });
                navigate("/");
                return;
            }
        } catch (error: any) {
            console.error("User info failed:", error.response?.data || error.message);

            toast.error("Unable to verify permissions.", {
                style: {
                background: "#393939",
                color: "#FFFFFF",
                },
            });
            navigate("/");
        }
    };

    useEffect(() => {
        fetchUserInfo();
        if (employeeId) {
          fetchDocuments();
        } else {
            setLoading(false);
        }
    }, []);

    const fetchDocuments = async () => {
        try {
            const res = await axios.get(`http://localhost:8000/documents/employee/${employeeId}`);
            const items: Document[] = res.data?.data || [];
            setDocuments(items);
        } catch (error: any) {
            console.error(
                "Error fetching documents:",
                error.response?.data || error.message
            );
            toast.error("Failed to load documents.", {
                style: { background: "#393939", color: "#FFFFFF" },
            });
        } finally {
            setLoading(false);
        }
    };

  return (
    <div className="w-screen h-screen flex flex-col items-center justify-center bg-zinc-900 px-20 md:px-80 sm:px-10">
      <div className="text-gray-200 text-3xl font-bold mb-6">
        View All Documents
      </div>

      <div className="w-full max-w-4xl bg-zinc-800 rounded-lg shadow-lg p-6 mb-6">
        {loading ? (
          <div className="text-gray-200 text-sm">Loading documents...</div>
        ) : documents.length === 0 ? (
          <div className="text-gray-400 text-sm">No documents found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-gray-200">
              <thead>
                <tr className="border-b border-zinc-700">
                  <th className="py-2 px-3">Document Name</th>
                  <th className="py-2 px-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc, idx) => {
                  const key = doc.id || doc._id || idx;
                  const docName = doc.title || "Untitled";

                  return (
                    <tr
                      key={key}
                      onClick={() => openModal(doc)}
                      className="border-b border-zinc-700 hover:bg-zinc-700/40 cursor-pointer"
                    >
                      <td className="py-2 px-3">{docName}</td>
                      <td className="py-2 px-3">{doc.status || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <button
        onClick={handleBack}
        className="mt-1 h-8 px-10 bg-neutral-700 hover:bg-neutral-600 rounded-md text-gray-200 hover:text-gray-300 text-sm cursor-pointer"
      >
        Back to Home
      </button>

      {/* Modal for document details */}
      {isModalOpen && selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-zinc-800 rounded-lg shadow-xl w-full max-w-lg p-6 relative">
            {/* Close button */}
            <button
              onClick={closeModal}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-200 text-xl leading-none"
            >
              ×
            </button>

            <h2 className="text-xl font-semibold text-gray-100 mb-4">
              {selectedDoc.title || "Untitled Document"}
            </h2>

            <div className="space-y-2 text-sm text-gray-200">
              <p>
                <span className="font-semibold text-gray-300">Owner ID:</span>{" "}
                {selectedDoc.owner_id || "—"}
              </p>
              <p>
                <span className="font-semibold text-gray-300">Status:</span>{" "}
                {selectedDoc.status || "—"}
              </p>
              <p>
                <span className="font-semibold text-gray-300">Created At:</span>{" "}
                {formatDate(selectedDoc.created_at)}
              </p>
              <p>
                <span className="font-semibold text-gray-300">Updated At:</span>{" "}
                {formatDate(selectedDoc.updated_at)}
              </p>

              {selectedDoc.description && (
                <p className="mt-3">
                  <span className="font-semibold text-gray-300">
                    Description:
                  </span>
                  <br />
                  <span className="text-gray-300">
                    {selectedDoc.description}
                  </span>
                </p>
              )}

              {selectedDoc.review != null && (
                <p className="mt-2">
                  <span className="font-semibold text-gray-300">Reviewed By:</span>
                    <br />
                  <span className="text-gray-300">{selectedDoc.review.reviewer_id}</span>
                    <br />
                  <span className="font-semibold text-gray-300">Date of Review:</span>
                    <br />
                  <span className="text-gray-300">{selectedDoc.review.decided_at}</span>
                    <br />
                  <span className="font-semibold text-gray-300">Comments:</span>
                    <br />
                  <span className="text-gray-300">{selectedDoc.review.comment}</span>
                    <br />
                </p>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={closeModal}
                className="px-4 py-2 rounded-md bg-neutral-700 hover:bg-neutral-600 text-gray-100 text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ViewEmployeeDocuments;
