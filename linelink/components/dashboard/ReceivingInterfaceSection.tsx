import LiveStatusBar from "./LiveStatusBar"
import { useState } from "react"
import { Button } from "../ui/button"
import { Package, ClipboardList, CheckCircle } from "lucide-react"

const mockWorkOrders = [
    {
        id: "WO-001",
        name: "Assemble Widget A",
        missingParts: [
            { part: "123", qty: 10, status: "Dispatched" },
            { part: "124", qty: 5, status: "Requested" },
        ],
    },
    {
        id: "WO-002",
        name: "Test Device B",
        missingParts: [
            { part: "555", qty: 5, status: "Dispatched" },
        ],
    },
]

const statusColors: Record<string, string> = {
    Requested: "bg-yellow-100 text-yellow-800",
    Dispatched: "bg-blue-100 text-blue-800",
    Acknowledged: "bg-green-100 text-green-800",
}

function getNowString() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function ReceivingInterfaceSection() {
    const [selectedWO, setSelectedWO] = useState(mockWorkOrders[0])
    const [partNumber, setPartNumber] = useState("")
    const [partQty, setPartQty] = useState("")
    const [missingParts, setMissingParts] = useState(selectedWO.missingParts)
    const [lastUpdated, setLastUpdated] = useState(getNowString())

    function handleWOChange(e: React.ChangeEvent<HTMLSelectElement>) {
        const wo = mockWorkOrders.find(w => w.id === e.target.value)
        if (wo) {
            setSelectedWO(wo)
            setMissingParts(wo.missingParts)
            setPartNumber("")
            setPartQty("")
        }
    }

    function handleReceive(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setMissingParts(parts => parts.map(p =>
            p.part === partNumber && p.status === "Dispatched"
                ? { ...p, status: "Acknowledged" }
                : p
        ))
        setLastUpdated(getNowString())
        setPartNumber("")
        setPartQty("")
    }

    return (
        <div className="bg-white rounded-lg shadow p-6 max-w-xl mx-auto">
            <LiveStatusBar lastUpdated={lastUpdated} />
            <h2 className="text-xl font-bold mb-4 flex items-center"><CheckCircle className="w-5 h-5 mr-2" />Receiving Interface</h2>
            <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Select Work Order</label>
                <select value={selectedWO.id} onChange={handleWOChange} className="border rounded px-2 py-1 w-full">
                    {mockWorkOrders.map(wo => (
                        <option key={wo.id} value={wo.id}>{wo.id} - {wo.name}</option>
                    ))}
                </select>
            </div>
            <div className="mb-4">
                <h4 className="font-semibold mb-2 flex items-center"><Package className="w-4 h-4 mr-1" />Missing Parts</h4>
                <ul className="space-y-1">
                    {missingParts.map((p, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm">
                            <span>Part #{p.part} &times; {p.qty}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColors[p.status]}`}>{p.status}</span>
                        </li>
                    ))}
                </ul>
            </div>
            <form className="flex gap-2 mb-2" onSubmit={handleReceive}>
                <input
                    type="text"
                    className="border rounded px-2 py-1 text-sm w-32"
                    placeholder="Part #"
                    value={partNumber}
                    onChange={e => setPartNumber(e.target.value)}
                />
                <input
                    type="number"
                    className="border rounded px-2 py-1 text-sm w-20"
                    placeholder="Qty"
                    value={partQty}
                    onChange={e => setPartQty(e.target.value)}
                    min={1}
                />
                <Button type="submit" size="sm">Acknowledge</Button>
            </form>
            <div className="text-xs text-gray-500">Enter the part number and quantity received to acknowledge.</div>
        </div>
    )
} 