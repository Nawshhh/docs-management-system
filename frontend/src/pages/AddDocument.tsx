import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";

const API_URL = "http://localhost:8000/documents"; 
// change to your actual backend URL if different

function AddDocument() {
    const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const TITLE_MAX = 50;
  const DESC_MAX = 100;

  const openModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (submitting) return;
    setIsModalOpen(false);
    setTitle("");
    setDescription("");
  };

    const handleBack = () => {
        navigate("/employee-homepage");
    };

    useEffect(() => {
        fetchUserInfo();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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

    const employeeId = localStorage.getItem("my_id");
    if (!employeeId) {
      toast.error("No employee ID found. Please log in again.", {
        style: { background: "#393939", color: "#FFFFFF" },
      });
      return;
    }

    try {
      setSubmitting(true);

      const res = await axios.post(API_URL, {
        title: trimmedTitle,
        description: trimmedDesc,
        user_id: employeeId,
      });

      console.log("Document created:", res.data);
      toast.success("Document created successfully!", {
        style: { background: "#393939", color: "#FFFFFF" },
      });

      // reset + close modal
      setTitle("");
      setDescription("");
      setIsModalOpen(false);
    } catch (error: any) {
      console.error(
        "Error creating document:",
        error.response?.data || error.message
      );
      toast.error("Failed to create document.", {
        style: { background: "#393939", color: "#FFFFFF" },
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-screen h-screen flex flex-col items-center justify-center bg-zinc-900 px-20 md:px-80 sm:px-10">
      <div className="text-gray-200 text-3xl font-bold mb-6">
        Add Document
      </div>

      <div className="w-full max-w-md bg-zinc-800 rounded-lg shadow-lg p-6 flex flex-col items-center">
        <p className="text-gray-300 text-sm mb-4 text-center">
          Create a new document by providing a title and a brief description.
        </p>

        <button
          onClick={openModal}
          className="h-10 px-8 mb-5 bg-sky-700 hover:bg-sky-600 rounded-md text-gray-100 hover:text-gray-200 text-sm font-semibold cursor-pointer"
        >
          Add Document
        </button>
        <button
            onClick={handleBack}
            className="mt-1 h-8 px-10 bg-neutral-700 hover:bg-neutral-600 rounded-md text-gray-200 hover:text-gray-300 text-sm cursor-pointer"
        >
            Back to Home
        </button>
      </div>



      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-zinc-800 rounded-lg shadow-xl w-full max-w-lg p-6 relative">
            {/* Close X */}
            <button
              onClick={closeModal}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-200 text-xl leading-none"
              disabled={submitting}
            >
              ×
            </button>

            <h2 className="text-xl font-semibold text-gray-100 mb-4">
              New Document
            </h2>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
                  {submitting ? "Saving..." : "Save Document"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AddDocument;
