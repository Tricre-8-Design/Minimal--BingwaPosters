{/* Classic Posters Maintenance Modal */ }
{
    activeTab === "classic" && maintenanceStatus.placid.isUnderMaintenance && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in-0 duration-300">
            <Card className="p-8 max-w-2xl w-full bg-orange-50/95 border-2 border-orange-500/50 shadow-2xl">
                <div className="text-center space-y-6">
                    <div className="flex justify-center">
                        <div className="p-4 bg-orange-500/20 rounded-full">
                            <svg className="w-16 h-16 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold text-orange-900 mb-2 font-space">
                            Classic Poster Studio Under Maintenance
                        </h2>
                        <div className="h-1 w-24 bg-orange-500 mx-auto rounded-full"></div>
                    </div>
                    <div className="bg-white/50 border border-orange-200 rounded-lg p-6">
                        <p className="text-orange-900 text-lg leading-relaxed mb-4">
                            {maintenanceStatus.placid.message}
                        </p>
                        <div className="text-sm text-orange-700">
                            <p className="font-semibold mb-2">What you can do:</p>
                            <ul className="list-disc list-inside space-y-1 text-left">
                                {maintenanceStatus.ai.isUnderMaintenance ? (
                                    <li>Both poster creation systems are currently being upgraded. Please check back soon.</li>
                                ) : (
                                    <>
                                        <li>Try our AI-powered Instant Posters (available now)</li>
                                        <li>Check back in a few minutes for Classic Posters</li>
                                    </>
                                )}
                            </ul>
                        </div>
                    </div>
                    <div className="flex gap-4 justify-center">
                        {!maintenanceStatus.ai.isUnderMaintenance && (
                            <Button
                                onClick={() => setActiveTab("instant")}
                                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-8 py-6 text-lg font-semibold shadow-lg"
                            >
                                Switch to Instant Posters
                            </Button>
                        )}
                        <Button
                            onClick={() => window.location.reload()}
                            variant="outline"
                            className="bg-white hover:bg-orange-50 border-orange-300 text-orange-900 px-8 py-6 text-lg font-semibold"
                        >
                            Refresh Page
                        </Button>
                    </div>
                    <p className="text-sm text-orange-600">
                        We appreciate your patience as we improve our services.
                    </p>
                </div>
            </Card>
        </div>
    )
}

{/* Instant Posters (AI) Maintenance Modal */ }
{
    activeTab === "instant" && maintenanceStatus.ai.isUnderMaintenance && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in-0 duration-300">
            <Card className="p-8 max-w-2xl w-full bg-purple-50/95 border-2 border-purple-500/50 shadow-2xl">
                <div className="text-center space-y-6">
                    <div className="flex justify-center">
                        <div className="p-4 bg-purple-500/20 rounded-full">
                            <svg className="w-16 h-16 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold text-purple-900 mb-2 font-space">
                            Instant AI Posters Under Maintenance
                        </h2>
                        <div className="h-1 w-24 bg-purple-500 mx-auto rounded-full"></div>
                    </div>
                    <div className="bg-white/50 border border-purple-200 rounded-lg p-6">
                        <p className="text-purple-900 text-lg leading-relaxed mb-4">
                            {maintenanceStatus.ai.message}
                        </p>
                        <div className="text-sm text-purple-700">
                            <p className="font-semibold mb-2">What you can do:</p>
                            <ul className="list-disc list-inside space-y-1 text-left">
                                {maintenanceStatus.placid.isUnderMaintenance ? (
                                    <li>Both poster creation systems are currently being upgraded. Please check back soon.</li>
                                ) : (
                                    <>
                                        <li>Use our Classic Posters with ready-made templates (available now)</li>
                                        <li>Check back soon for AI Posters</li>
                                    </>
                                )}
                            </ul>
                        </div>
                    </div>
                    <div className="flex gap-4 justify-center">
                        {!maintenanceStatus.placid.isUnderMaintenance && (
                            <Button
                                onClick={() => setActiveTab("classic")}
                                className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-8 py-6 text-lg font-semibold shadow-lg"
                            >
                                Switch to Classic Posters
                            </Button>
                        )}
                        <Button
                            onClick={() => window.location.reload()}
                            variant="outline"
                            className="bg-white hover:bg-purple-50 border-purple-300 text-purple-900 px-8 py-6 text-lg font-semibold"
                        >
                            Refresh Page
                        </Button>
                    </div>
                    <p className="text-sm text-purple-600">
                        We appreciate your patience as we improve our services.
                    </p>
                </div>
            </Card>
        </div>
    )
}
