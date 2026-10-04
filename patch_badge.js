const fs = require('fs');
const file = 'next-app/src/components/staff/StorageExplorerTab.js';
let content = fs.readFileSync(file, 'utf8');

const targetStr1 = `                            {/* Target pulsing glow */}
                            {isTarget && (
                              <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[10px] font-semibold text-white animate-pulse">
                                
                                Target Room
                              </div>
                            )}
                            {/* Non-target status badge */}
                            {!isTarget && (
                              <div className="absolute top-4 right-4">
                                <Badge className={cn("border-0 text-[10px] font-semibold px-2.5 py-0.5 rounded-full shadow-none", statusColor)}>
                                  {statusLabel}
                                </Badge>
                              </div>
                            )}`;

const targetStr2 = `                                  {/* Room Number */}
                                  <div className="mb-3">
                                    <h5 className={cn(
                                      "text-[18px] font-bold tracking-tight font-jakarta leading-none truncate",
                                      isTarget ? "text-white" : "text-gray-900 dark:text-[#f2f2f7]"
                                    )}>
                                      {r.name || \`Room \${r.room}\`}
                                    </h5>
                                  </div>`;

const replaceStr2 = `                                  {/* Room Number */}
                                  <div className="mb-3 flex flex-wrap items-center gap-2">
                                    <h5 className={cn(
                                      "text-[18px] font-bold tracking-tight font-jakarta leading-none truncate",
                                      isTarget ? "text-white" : "text-gray-900 dark:text-[#f2f2f7]"
                                    )}>
                                      {r.name || \`Room \${r.room}\`}
                                    </h5>
                                    
                                    {/* Status badge moved inline */}
                                    {isTarget ? (
                                      <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[10px] font-semibold text-white animate-pulse shrink-0">
                                        Target Room
                                      </div>
                                    ) : (
                                      <Badge className={cn("border-0 text-[10px] font-semibold px-2.5 py-0.5 rounded-full shadow-none shrink-0", statusColor)}>
                                        {statusLabel}
                                      </Badge>
                                    )}
                                  </div>`;

content = content.replace(targetStr1, "");
content = content.replace(targetStr2, replaceStr2);

fs.writeFileSync(file, content, 'utf8');
