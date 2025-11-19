import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";


function Documents() {

  const navigate = useNavigate();

  const handleHome = () => {
    navigate("/manager-homepage");
  }

  const handleApproveDocuments = () => {
    navigate("/approve-documents");
  }

  const handleViewDocuments = () => {
    navigate("/view-documents");
  }

  const handleDeleteDocuments = () => {
    navigate("/delete-documents");
  }

  const handleRejectDocuments = () => {
    navigate("/reject-documents");
  }

    useEffect(() => {
        fetchUserInfo();
    }, []);

    const fetchUserInfo = async () => {
        const token = localStorage.getItem("token");
        if (!token) {
            console.log("No token found — user probably logged out");
            toast.error("No permission. Managers only.", {
                style: { background: "#393939", color: "#FFFFFF" },
            });
            navigate("/");
            return;
        }

        try {
            const res = await axios.get("http://localhost:8000/auth/me", {
                headers: { Authorization: `Bearer ${token}` },
                withCredentials: true,
            });

             

            // role check using userData
            if (res.data.data.role !== "MANAGER") {
                toast.error("Access denied. Managers only.", {
                style: { background: "#393939", color: "#FFFFFF" },
                });
                navigate("/");
                return;
            }

        } catch (error: any) {
            console.error("User info failed:", error.response?.data || error.message);
            toast.error("Re-authenticate again", {
                style: { background: "#393939", color: "#FFFFFF" },
            });
            navigate("/");
        }
    };

  return (
    <div className='w-screen h-screen flex flex-col items-center justify-center bg-zinc-900 px-20 md:px-80 sm:px-10'>
        <p className='font-semibold text-3xl text-gray-200 mb-10'>Documents Page</p>
        <div className='grid grid-cols-2 gap-6 w-full my-10 text-gray-200 text-xl font-semibold'>
            <button 
                onClick={handleViewDocuments}
                className='flex items-center justify-center bg-slate-700 hover:bg-slate-600 rounded-md h-20 cursor-pointer'>
                View Documents
            </button>
            <button  
                onClick={handleApproveDocuments}
                className='flex items-center justify-center bg-slate-700 hover:bg-slate-600 rounded-md h-20 cursor-pointer'>
                Approve Documents
            </button>
            <button  
                onClick={handleRejectDocuments}
                className='flex items-center justify-center bg-slate-700 hover:bg-slate-600 rounded-md h-20 cursor-pointer'>
                Reject Documents
            </button>            
            <button  
                onClick={handleDeleteDocuments}
                className='flex items-center justify-center bg-slate-700 hover:bg-slate-600 rounded-md h-20 cursor-pointer'>
                Delete Documents
            </button>

        </div>
        <button 
            onClick={handleHome}
            className='mt-5 h-8 px-10 bg-neutral-700 hover:bg-neutral-600 rounded-md text-gray-200 hover:text-gray-300 text-sm cursor-pointer'
        >Back to Home</button>
    </div>
  )
}

export default Documents