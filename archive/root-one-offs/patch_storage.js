const fs = require('fs');
const file = 'next-app/src/components/staff/StorageExplorerTab.js';
let content = fs.readFileSync(file, 'utf8');

const targetStr = `                            <div className="relative z-10 flex flex-col flex-1 w-full">
                              {/* Room Number */}
                              <div className="mb-3">
                                <h5 className={cn(
                                  "text-[18px] font-bold tracking-tight font-jakarta leading-none",
                                  isTarget ? "text-white" : "text-gray-900 dark:text-[#f2f2f7]"
                                )}>
                                  {r.name || \`Room \${r.room}\`}
                                </h5>
                              </div>

                              {/* Stats breakdown */}
                              <div className="space-y-2 mt-1.5 flex-1">
                                <div className={cn(
                                  "flex items-center text-xs font-medium",
                                  isTarget ? "text-white/80" : "text-gray-550 dark:text-zinc-400"
                                )}>
                                  <HugeIcon  className="ph-bold ph-warehouse text-sm mr-2 opacity-80" />
                                  <span>{r.cabinetsCount} Cabinets installed</span>
                                </div>
                                <div className={cn(
                                  "flex items-center text-xs font-medium",
                                  isTarget ? "text-white/80" : "text-gray-550 dark:text-zinc-400"
                                )}>
                                  <HugeIcon  className="ph-bold ph-folder-open text-sm mr-2 opacity-80" />
                                  <span>{r.occupiedCount} {isOsas ? "Archived organization folders" : "Archived student folders"}</span>
                                </div>
                              </div>`;

const replaceStr = `                            <div className="relative z-10 flex flex-col flex-1 w-full">
                              <div className="flex w-full justify-between items-start flex-1 gap-2">
                                <div className="flex flex-col flex-1 min-w-0">
                                  {/* Room Number */}
                                  <div className="mb-3">
                                    <h5 className={cn(
                                      "text-[18px] font-bold tracking-tight font-jakarta leading-none truncate",
                                      isTarget ? "text-white" : "text-gray-900 dark:text-[#f2f2f7]"
                                    )}>
                                      {r.name || \`Room \${r.room}\`}
                                    </h5>
                                  </div>

                                  {/* Stats breakdown */}
                                  <div className="space-y-2 mt-1.5 flex-1">
                                    <div className={cn(
                                      "flex items-center text-xs font-medium truncate",
                                      isTarget ? "text-white/80" : "text-gray-550 dark:text-zinc-400"
                                    )}>
                                      <HugeIcon  className="ph-bold ph-warehouse text-sm mr-2 opacity-80 shrink-0" />
                                      <span className="truncate">{r.cabinetsCount} Cabinets installed</span>
                                    </div>
                                    <div className={cn(
                                      "flex items-center text-xs font-medium truncate",
                                      isTarget ? "text-white/80" : "text-gray-550 dark:text-zinc-400"
                                    )}>
                                      <HugeIcon  className="ph-bold ph-folder-open text-sm mr-2 opacity-80 shrink-0" />
                                      <span className="truncate">{r.occupiedCount} {isOsas ? "Archived organization folders" : "Archived student folders"}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Room Preview Thumbnail */}
                                <div className="w-[76px] h-[60px] shrink-0 pointer-events-none opacity-90 rounded-md overflow-hidden bg-white dark:bg-zinc-800 border border-border/60 dark:border-border ml-2 relative">
                                  <div className="absolute inset-[-14px]">
                                    <RoomMap2D
                                      kind="cabinets"
                                      cabinets={r.cabinets}
                                      roomDoor={r.door}
                                      isPreview={true}
                                    />
                                  </div>
                                </div>
                              </div>`;

content = content.replace(targetStr, replaceStr);
fs.writeFileSync(file, content, 'utf8');
