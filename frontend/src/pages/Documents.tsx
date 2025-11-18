import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";


function Documents() {

  const navigate = useNavigate();

  const my_id = localStorage.getItem("my_id");

  useEffect(() => {
    console.log("Documents Page loaded with my_id:", my_id);
  }, [my_id]);

  const handleHome = () => {
    navigate("/manager-homepage", { state: { my_id: my_id } });
  }

  // // soon to implement
  // const handleApproveDocuments = () => {
  //   navigate("");
  // }

  const handleViewDocuments = () => {
    navigate("/view-documents");
  }

  return (
    <div className='w-screen h-screen flex flex-col items-center justify-center bg-zinc-900 px-20 md:px-80 sm:px-10'>
        <p className='font-semibold text-3xl text-gray-200 mb-10'>Documents Page</p>
        <div className='grid grid-cols-3 gap-6 w-full my-10 text-gray-200 text-xl font-semibold'>
            <button 
                onClick={handleViewDocuments}
                className='flex items-center justify-center bg-slate-700 hover:bg-slate-600 rounded-md h-20 cursor-pointer'>
                View Documents
            </button>
            <button  
                className='flex items-center justify-center bg-slate-700 hover:bg-slate-600 rounded-md h-20 cursor-pointer'>
                Approve Documents
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