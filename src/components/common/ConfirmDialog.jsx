import React from "react";
import { AlertCircle, HelpCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ConfirmDialog({
                                          isOpen,
                                          title = "Confirm Action",
                                          message = "Are you sure you want to proceed?",
                                          confirmText = "Confirm",
                                          cancelText = "Cancel",
                                          variant = "primary", // "primary" | "danger"
                                          isLoading = false,
                                          onConfirm,
                                          onCancel,
                                      }) {
    if (!isOpen) return null;

    const isDanger = variant === "danger";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in-0 duration-200">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                        <div
                            className={`p-2 rounded-xl ${
                                isDanger ? "bg-red-100 text-red-600" : "bg-indigo-50 text-[#0F2942]"
                            }`}
                        >
                            {isDanger ? (
                                <AlertCircle className="h-5 w-5" />
                            ) : (
                                <HelpCircle className="h-5 w-5 text-[#0F2942]" />
                            )}
                        </div>
                        <h3 className="text-base font-bold text-[#0F2942]">{title}</h3>
                    </div>
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isLoading}
                        className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Message */}
                <p className="text-xs font-medium text-slate-600 leading-relaxed pl-1">
                    {message}
                </p>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={onCancel}
                        disabled={isLoading}
                        className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer text-xs px-4"
                    >
                        {cancelText}
                    </Button>

                    <Button
                        type="button"
                        size="sm"
                        disabled={isLoading}
                        onClick={onConfirm}
                        className={`rounded-xl font-bold cursor-pointer text-xs px-4 transition-all ${
                            isDanger
                                ? "bg-red-600 hover:bg-red-700 text-white"
                                : "bg-[#0F2942] hover:bg-[#163a5d] text-white"
                        }`}
                    >
                        {isLoading ? "Processing..." : confirmText}
                    </Button>
                </div>
            </div>
        </div>
    );
}