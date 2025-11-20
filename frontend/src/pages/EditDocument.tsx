import React, { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

type Document = {
  id?: string;
  _id?: string;
  title?: string;
  description?: string;
  owner_id?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
};

const TITLE_MAX = 50;
const DESC_MAX = 100;

function EditDocument() {
    const navigate = useNavigate();

    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);

    const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [submitting, setSubmitting] = useState(false);

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

    // Fetch all documents for this employee
      const fetchDocs = async () => {
        if (!employeeId) {
            toast.error("No employee ID found. Please log in again.", {
            style: { background: "#393939", color: "#FFFFFF" },
            });
            navigate("/");
            return;
        }

        try {
            const res = await axios.get(
            `http://localhost:8000/documents/employee/${employeeId}`
            );

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

    // useEffect(() => {
    //     fetchDocs();
    // },[employeeId])

    useEffect(() => {
        fetchUserInfo();
        if (employeeId) {
          fetchDocs();
        }
    }, []);

    const fetchUserInfo = async () => {
        try {
            const res = await axios.get("http://localhost:8000/auth/me", {
                withCredentials: true,
            });

            const { ok, data, error } = res.data;

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

            console.log("emp id: ",userData.id);

            setEmployeeId(userData.id)
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

    const openModal = (doc: Document) => {
        setSelectedDoc(doc);
        setTitle(doc.title || "");
        setDescription(doc.description || "");
        setIsModalOpen(true);
    };

    const closeModal = () => {
        if (submitting) return;
        setIsModalOpen(false);
        setSelectedDoc(null);
        setTitle("");
        setDescription("");
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedDoc) return;

        const trimmedTitle = title.trim();
        const trimmedDesc = description.trim();

        if (!trimmedTitle || !trimmedDesc) {
        toast.error("Please fill in both title and description.", {
            style: { background: "#393939", color: "#FFFFFF" },
        });
        return;
        }

        if (trimmedTitle.length > TITLE_MAX || trimmedDesc.length > DESC_MAX) {
        toast.error("Please respect the character limits.", {
            style: { background: "#393939", color: "#FFFFFF" },
        });
        return;
        }

        if (!employeeId) {
        toast.error("No user ID found. Please log in again.", {
            style: { background: "#393939", color: "#FFFFFF" },
        });
        return;
        }

        const docId = selectedDoc.id || selectedDoc._id;
        if (!docId) {
        toast.error("Invalid document ID.", {
            style: { background: "#393939", color: "#FFFFFF" },
        });
        return;
        }

        try {
        setSubmitting(true);

            const res = await axios.patch(
            `http://localhost:8000/documents/${docId}`,
            {
                title: trimmedTitle,
                description: trimmedDesc,
                user_id: employeeId, 
            },
            {
                withCredentials: true,
            }
            );

        console.log("Document updated:", res.data);
        toast.success("Document updated successfully!", {
            style: { background: "#393939", color: "#FFFFFF" },
        });
        // referesh
        setDocuments((prev) =>
            prev.map((d) =>
            d.id === docId || d._id === docId
                ? {
                    ...d,
                    title: trimmedTitle,
                    description: trimmedDesc,
                    updated_at: new Date().toISOString(),
                }
                : d
            )
        );

        closeModal();
        } catch (error: any) {
        console.error(
            "Error updating document:",
            error.response?.data || error.message
        );
        toast.error("Failed to update document.", {
            style: { background: "#393939", color: "#FFFFFF" },
        });
        } finally {
        setSubmitting(false);
        }
    };

  return (
    <div className="w-screen h-screen flex flex-col items-center justify-center bg-zinc-900 px-20 md:px-80 sm:px-10">
      <div className="text-gray-200 text-3xl font-bold mb-6">
        Edit My Documents
      </div>

      <div className="w-full max-w-4xl bg-zinc-800 rounded-lg shadow-lg p-6 mb-6">
        {Document.length != 0 ? (
          <div className="text-gray-200 text-sm">Loading documents...</div>
        ) : documents.length === 0 ? (
          <div className="text-gray-400 text-sm">
            You have no documents yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-gray-200">
              <thead>
                <tr className="border-b border-zinc-700">
                  <th className="py-2 px-3">Document Name</th>
                  <th className="py-2 px-3">Created At</th>
                  <th className="py-2 px-3">Updated At</th>
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
                      <td className="py-2 px-3">
                        {formatDate(doc.created_at)}
                      </td>
                      <td className="py-2 px-3">
                        {formatDate(doc.updated_at)}
                      </td>
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
        Back to Documents
      </button>

      {/* Edit Modal */}
      {isModalOpen && selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-zinc-800 rounded-lg shadow-xl w-full max-w-lg p-6 relative">
            {/* Close button */}
            <button
              onClick={closeModal}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-200 text-xl leading-none"
              disabled={submitting}
            >
              ×
            </button>

            <h2 className="text-xl font-semibold text-gray-100 mb-4">
              Edit Document
            </h2>

            <form onSubmit={handleSave} className="flex flex-col gap-4">
              {/* Title */}
              <div className="flex flex-col">
                <label className="text-gray-300 text-sm mb-1">
                  Document Title
                </label>
                <input
                  type="text"
                  value={title}
                  maxLength={TITLE_MAX}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter document title"
                  className="rounded-md bg-zinc-700 text-gray-100 p-2 focus:outline-none focus:ring-2 focus:ring-sky-600"
                />
                <div className="text-xs text-gray-400 mt-1 text-right">
                  {title.length}/{TITLE_MAX}
                </div>
              </div>

              {/* Description */}
              <div className="flex flex-col">
                <label className="text-gray-300 text-sm mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  maxLength={DESC_MAX}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter short description"
                  rows={3}
                  className="rounded-md bg-zinc-700 text-gray-100 p-2 focus:outline-none focus:ring-2 focus:ring-sky-600 resize-none"
                />
                <div className="text-xs text-gray-400 mt-1 text-right">
                  {description.length}/{DESC_MAX}
                </div>
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={submitting}
                  className="px-4 py-2 rounded-md bg-neutral-700 hover:bg-neutral-600 text-gray-100 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-4 py-2 rounded-md text-sm font-semibold
                    ${
                      submitting
                        ? "bg-sky-900 text-gray-400 cursor-not-allowed"
                        : "bg-sky-700 hover:bg-sky-600 text-gray-100"
                    }`}
                >
                  {submitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default EditDocument;
