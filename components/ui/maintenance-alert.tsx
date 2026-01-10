import { AlertCircle, Wrench } from "lucide-react"
import { Card } from "@/components/ui/card"

interface MaintenanceAlertProps {
    engine: "placid" | "ai"
    message?: string
}

export default function MaintenanceAlert({ engine, message }: MaintenanceAlertProps) {
    const defaultMessage =
        engine === "placid"
            ? "Classic poster generation is temporarily unavailable for maintenance. Please try again later."
            : "AI poster generation is temporarily unavailable for maintenance. Please try again later."

    return (
        <Card className="bg-orange-500/10 border-2 border-orange-500/30 p-6 mb-6">
            <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-orange-500/20 flex-shrink-0">
                    <Wrench className="w-6 h-6 text-orange-400" />
                </div>
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="w-5 h-5 text-orange-400" />
                        <h3 className="text-lg font-semibold text-orange-300">Service Temporarily Unavailable</h3>
                    </div>
                    <p className="text-orange-200/90 leading-relaxed">{message || defaultMessage}</p>
                    <p className="text-orange-200/70 text-sm mt-3">
                        We apologize for the inconvenience. Our team is working to restore service as quickly as possible.
                    </p>
                </div>
            </div>
        </Card>
    )
}
