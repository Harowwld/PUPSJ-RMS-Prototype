const fs = require('fs');

let content = fs.readFileSync('src/components/admin/DigitalRecordsReviewTab.js', 'utf8');

const startStr = '<div ref={statCardsRef} className="grid grid-cols-1 gap-4 md:grid-cols-3 items-start relative z-20">';
const endStr = '              </div>\n            </div>\n          ) : null}';

const startIdx = content.indexOf(startStr);
const endIdx = content.indexOf(endStr, startIdx);

if (startIdx === -1 || endIdx === -1) {
    console.error("Could not find bounds");
    process.exit(1);
}

const originalBlock = content.slice(startIdx, endIdx);

const card1Start = originalBlock.indexOf('{/* Stat Card 1: Pending Review */}');
const card2Start = originalBlock.indexOf('{/* Stat Card 2: Approved Today */}');
const card3Start = originalBlock.indexOf('{/* Stat Card 3: Returned Today */}');

const card1Code = originalBlock.slice(card1Start, card2Start).trim();
const card2Code = originalBlock.slice(card2Start, card3Start).trim();
const card3Code = originalBlock.slice(card3Start).trim();

function wrapCard(code, key) {
    let replaced = code.replace('<div className={cn(', `<Reorder.Item as="div" value="${key}" key="${key}" className={cn("cursor-grab active:cursor-grabbing", `);
    
    // Replace the ending </div> with </Reorder.Item>
    replaced = replaced.slice(0, -6) + '</Reorder.Item>';
    
    // Restore the drag icon
    const valRegex = /(<span className="text-\[28px\].*?>.*?<\/span>)/s;
    const dragIcon = '\n                      <LucideIcon className="ph-bold ph-dots-six-vertical cursor-grab active:cursor-grabbing hover:text-gray-400 dark:hover:text-zinc-500 text-gray-300 dark:text-zinc-700 text-lg mb-0.5" />';
    
    replaced = replaced.replace(valRegex, `$1${dragIcon}`);
    return replaced;
}

const card1Wrapped = wrapCard(card1Code, "pending");
const card2Wrapped = wrapCard(card2Code, "approved");
const card3Wrapped = wrapCard(card3Code, "declined");

const newBlock = `<Reorder.Group as="div" axis="x" values={kpiOrder} onReorder={setKpiOrder} ref={statCardsRef} className="grid grid-cols-1 gap-4 md:grid-cols-3 items-start relative z-20">
                {kpiOrder.map(key => {
                  if (key === "pending") return (
                    ${card1Wrapped}
                  )
                  if (key === "approved") return (
                    ${card2Wrapped}
                  )
                  if (key === "declined") return (
                    ${card3Wrapped}
                  )
                  return null
                })}
              </Reorder.Group>`;

const newContent = content.slice(0, startIdx) + newBlock + '\n' + content.slice(endIdx);
fs.writeFileSync('src/components/admin/DigitalRecordsReviewTab.js', newContent);
console.log("Transformed successfully");
