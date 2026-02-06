import React from 'react'
import { BaseHandle, Position } from 'motia/workbench'

export default function ListUsersUI({ data }) {
    // Prevent code viewer from opening when clicked
    const handleClick = (e) => {
        e.stopPropagation()
        e.preventDefault()
        return false
    }

    return (
        <div
            onClick={handleClick}
            className="relative bg-white border-2 border-indigo-500 rounded-lg py-3 px-4 shadow-lg min-w-[240px] hover:scale-105 transition-transform"
            style={{ pointerEvents: 'auto' }}
        >
            <BaseHandle type="target" position={Position.Top} />

            <div className="flex flex-col items-center gap-2">
                <div className="bg-indigo-100 p-2 rounded-full">
                    <span className="text-xl">👥</span>
                </div>
                <div className="text-center">
                    <div className="font-bold text-indigo-900 uppercase text-xs tracking-wider">
                        API Endpoint
                    </div>
                    <div className="font-semibold text-gray-800 text-lg">
                        List Users
                    </div>
                    <div className="text-xs text-indigo-600 font-mono mt-1">
                        GET /api/users
                    </div>
                </div>

                <div className="w-full h-px bg-gray-100 my-1"></div>

                <div className="flex items-center gap-2 text-[10px] text-gray-500">
                    <span className="flex h-2 w-2 rounded-full bg-green-500"></span>
                    Connected to Supabase
                </div>
            </div>

            <BaseHandle type="source" position={Position.Bottom} />
        </div>
    )
}
