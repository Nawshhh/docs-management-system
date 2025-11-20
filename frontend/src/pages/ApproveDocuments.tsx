import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";

type Document = {
  id?: string;
  _id?: string;
  title?: string;
  owner_id?: string;
  status?: string;
};

function ApproveDocuments() {
    const navigate = useNavigate();

    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [approvingId, setApprovingId] = useState<string | null>(null);

    const [managerId, setManagerId] = useState<string | null>(null);

    useEffect(() => {
        fetchUserInfo();

        if (managerId){
            fetchDocuments();
        } else {
            setLoading(false);
        }
    }, []);

    const fetchUserInfo = async () => {
        try {
        const res = await axios.get("http://localhost:8000/auth/me", {
            withCredentials: true,
        });

         

        const { ok, data, error } = res.data;

        setManagerId(data.id);

        if (!ok || !data) {
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

        if (userData.role !== "MANAGER") {
            toast.error("Access denied. Managers only.", {
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

    const handleBack = () => {
        navigate("/documents");
    };

    const fetchDocuments = async () => {
    if (!managerId) {
        toast.error("No manager ID found.", {
        style: { background: "#393939", color: "#FFFFFF" },
        });
        setLoading(false);
        return;
    }

    try {
        const res = await axios.post(
        "http://localhost:8000/documents/view-docs/pending",
        { manager_id: managerId }
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


    const handleApprove = async (docId?: string) => {
        if (!docId || !managerId) return;

        setApprovingId(docId);
        try {
            const res = await axios.post(
                `http://localhost:8000/documents/reviews/${docId}/approve`,
                {
                    reviewer_id: managerId,
                    comment: "approved",
                    decided_at: new Date().toISOString(),
                }
            );

            console.log("Approve response:", res.data);

            toast.success("Document approved successfully.", {
                style: { background: "#393939", color: "#FFFFFF" },
            });

            // Remove approved document from list
            setDocuments((prev) => prev.filter((d) => d.id !== docId && d._id !== docId));
        } catch (error: any) {
            console.error(
                "Error approving document:",
                error.response?.data || error.message
            );
            toast.error("Failed to approve document.", {
                style: { background: "#393939", color: "#FFFFFF" },
            });
        } finally {
            setApprovingId(null);
        }
    };

    return (
    <div className="w-screen h-screen flex flex-col items-center justify-center bg-zinc-900 px-20 md:px-80 sm:px-10">
        <div className="text-gray-200 text-3xl font-bold mb-6">
        Approve Documents
        </div>

        <div className="w-full max-w-4xl bg-zinc-800 rounded-lg shadow-lg p-6 mb-6">
        {loading ? (
            <div className="text-gray-200 text-sm">Loading documents...</div>
        ) : documents.length === 0 ? (
            <div className="text-gray-400 text-sm">
            No pending documents to approve.
            </div>
        ) : (
            <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-gray-200">
                <thead>
                <tr className="border-b border-zinc-700">
                    <th className="py-2 px-3">Document Name</th>
                    <th className="py-2 px-3">Owner (owner_id)</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3 text-center">Approve</th>
                </tr>
                </thead>
                <tbody>
                {documents.map((doc, idx) => {
                    const docId = doc.id || doc._id || String(idx);
                    const docName = doc.title || "Untitled";
                    const owner = doc.owner_id || "—";
                    const isThisApproving = approvingId === (doc.id || doc._id);

                    return (
                    <tr
                        key={docId}
                        className="border-b border-zinc-700 hover:bg-zinc-700/40"
                    >
                        <td className="py-2 px-3">{docName}</td>
                        <td className="py-2 px-3">{owner}</td>
                        <td className="py-2 px-3">
                        {doc.status || "PENDING_REVIEW"}
                        </td>
                        <td className="py-2 px-3 text-center">
                        <button
                            onClick={() => handleApprove(doc.id || doc._id)}
                            disabled={isThisApproving}
                            className={`px-4 py-1 rounded-md text-sm font-medium
                            ${
                                isThisApproving
                                ? "bg-sky-900 text-gray-400 cursor-not-allowed"
                                : "bg-sky-700 hover:bg-sky-600 text-gray-100"
                            }`}
                        >
                            {isThisApproving ? "Approving..." : "Approve"}
                        </button>
                        </td>
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
    </div>
    );


}

export default ApproveDocuments;
