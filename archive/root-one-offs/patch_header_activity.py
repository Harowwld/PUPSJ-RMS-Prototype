import re

with open('next-app/src/components/layout/Header.js', 'r') as f:
    content = f.read()

old_activity_item = """                  <DropdownMenuItem
                    className={cn(
                      "cursor-pointer rounded-[8px] flex items-center gap-3 font-normal text-[16px] py-3 px-4 transition-colors outline-none",
                      isActivityActive
                        ? "text-gray-900 bg-gray-50 dark:text-zinc-100 dark:bg-white/5 font-normal"
                        : "text-gray-900 hover:bg-gray-50 dark:text-zinc-100 dark:hover:bg-white/5"
                    )}
                    onClick={() => router.push("/account/activity")}
                  >
                    <HugeIcon  className="ti ti-history text-[22px] shrink-0 flex items-center justify-center h-[22px] w-[22px] leading-none text-black dark:text-white"></HugeIcon>
                    <span>My Activity</span>
                  </DropdownMenuItem>"""

new_activity_item = """                  {!isActivityActive && (
                    <DropdownMenuItem
                      className={cn(
                        "cursor-pointer rounded-[8px] flex items-center gap-3 font-normal text-[16px] py-3 px-4 transition-colors outline-none",
                        "text-gray-900 hover:bg-gray-50 dark:text-zinc-100 dark:hover:bg-white/5"
                      )}
                      onClick={() => router.push("/account/activity")}
                    >
                      <HugeIcon  className="ti ti-history text-[22px] shrink-0 flex items-center justify-center h-[22px] w-[22px] leading-none text-black dark:text-white"></HugeIcon>
                      <span>My Activity</span>
                    </DropdownMenuItem>
                  )}"""

if old_activity_item in content:
    content = content.replace(old_activity_item, new_activity_item)
    with open('next-app/src/components/layout/Header.js', 'w') as f:
        f.write(content)
    print("Replaced Activity Item")
else:
    print("Could not find old_activity_item")
