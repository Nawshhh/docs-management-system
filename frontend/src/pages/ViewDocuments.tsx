import React, { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

type Document = {
  id?: string;
  title?: string;          // adjust if your backend uses `title` or `document_name`
  status?: string;
  created_at?: string;
  updated_at?: string;
};

function ViewDocuments() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  const managerId = localStorage.getItem("my_id");

  const handleBack = () => {
    navigate("/documents");
  };

  const formatDate = (value?: string) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value; // fallback if not a valid date
    return d.toLocaleString("en-PH", { timeZone: "Asia/Manila" });
  };

    useEffect(() => {
    const fetchDocuments = async () => {
        try {
            const res = await axios.post( "http://localhost:8000/documents/reviews/pending/",
                {manager_id: managerId}
            );

            const raw_docs = res.data.data[0]
            console.log("Documents fetched:", raw_docs);

            const items: Document[] = raw_docs || [];
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

    fetchDocuments();
    }, [managerId]);



  return (
    <div className="w-screen h-screen flex flex-col items-center justify-center bg-zinc-900 px-20 md:px-80 sm:px-10">
      <div className="text-gray-200 text-3xl font-bold mb-6">
        View All Documents
      </div>

      <div className="w-full max-w-4xl bg-zinc-800 rounded-lg shadow-lg p-6 mb-6">
        {loading ? (
          <div className="text-gray-200 text-sm">Loading documents...</div>
        ) : documents.length === 0 ? (
          <div className="text-gray-400 text-sm">
            No documents found.
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
                  const key = doc.id || doc.id || idx;
                  const docName = doc.title || "Untitled";

                  return (
                    <tr
                      key={key}
                      className="border-b border-zinc-700 hover:bg-zinc-700/40"
                    >
                      <td className="py-2 px-3">{docName}</td>
                      <td className="py-2 px-3">
                        {formatDate(doc.created_at)}
                      </td>
                      <td className="py-2 px-3">
                        {formatDate(doc.updated_at)}
                      </td>
                      <td className="py-2 px-3">
                        {doc.status || "—"}
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
        Back to Home
      </button>
    </div>
  );
}

export default ViewDocuments;
