import { useNavigate } from 'react-router-dom'

function DeleteDocuments() {
    const navigate = useNavigate();

    const handleBack = () => {
        navigate("/documents");
    };
    return (
        <div className="w-screen h-screen flex flex-col items-center justify-center bg-zinc-900 px-20 md:px-80 sm:px-10">
            <div className="text-gray-200 text-3xl font-bold mb-6">
                Delete Documents
            </div>
            <button
                onClick={handleBack}
                className="mt-1 h-8 px-10 bg-neutral-700 hover:bg-neutral-600 rounded-md text-gray-200 hover:text-gray-300 text-sm cursor-pointer"
            >
                Back to Documents
            </button>
        </div>
    )
}

export default DeleteDocuments