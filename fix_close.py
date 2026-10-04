import re

with open("next-app/src/app/student/page.js", "r") as f:
    content = f.read()

# Fix for Document Request tab (around line 1134)
old_request_button = """<Button
                            type="button"
                            onClick={() => setIsFormOpen((prev) => !prev)}
                            variant={isFormOpen ? "outline" : "default"}
                            className={cn(
                              "flex h-10 px-5 text-xs font-semibold rounded-xl! active:scale-95 transition-all cursor-pointer shadow-xs",
                              isFormOpen
                                ? "border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700"
                                : "btn-brand-red text-white! border-0"
                            )}
                            title={isFormOpen ? "Hide Request Form" : "New Document Request"}
                            style={!isFormOpen ? { color: "#ffffff" } : undefined}
                          >
                            {isFormOpen ? "Close" : "Request"}
                          </Button>"""

new_request_button = """{!isFormOpen && (
                            <Button
                              type="button"
                              onClick={() => setIsFormOpen(true)}
                              className="flex h-10 px-5 text-xs font-semibold rounded-xl! active:scale-95 transition-all cursor-pointer shadow-xs btn-brand-red text-white! border-0"
                              title="New Document Request"
                              style={{ color: "#ffffff" }}
                            >
                              Request
                            </Button>
                          )}"""

# Fix for OSAS tab (around line 1910)
old_osas_button = """<Button
                          type="button"
                          onClick={() => setIsFormOpen((prev) => !prev)}
                          variant={isFormOpen ? "outline" : "default"}
                          disabled={myOrganizations.length === 0}
                          title={myOrganizations.length === 0 ? "You must be an authorized officer in the OSAS whitelist to submit proposals" : isFormOpen ? "Close Form" : osasSubView === "proposals" ? "New Proposal" : osasSubView === "post_event" ? "New Report" : "Submit CBL"}
                          className={cn(
                            "flex h-10 px-5 text-xs font-semibold rounded-xl! active:scale-95 transition-all cursor-pointer shadow-xs",
                            isFormOpen
                              ? "border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700"
                              : "btn-brand-red text-white! border-0",
                            myOrganizations.length === 0 && "opacity-50 cursor-not-allowed"
                          )}
                          style={!isFormOpen && myOrganizations.length > 0 ? { color: "#ffffff" } : undefined}
                        >
                          {isFormOpen ? "Close" : "Submit"}
                        </Button>"""

new_osas_button = """{!isFormOpen && (
                          <Button
                            type="button"
                            onClick={() => setIsFormOpen(true)}
                            disabled={myOrganizations.length === 0}
                            title={myOrganizations.length === 0 ? "You must be an authorized officer in the OSAS whitelist to submit proposals" : osasSubView === "proposals" ? "New Proposal" : osasSubView === "post_event" ? "New Report" : "Submit CBL"}
                            className={cn(
                              "flex h-10 px-5 text-xs font-semibold rounded-xl! active:scale-95 transition-all cursor-pointer shadow-xs btn-brand-red text-white! border-0",
                              myOrganizations.length === 0 && "opacity-50 cursor-not-allowed"
                            )}
                            style={myOrganizations.length > 0 ? { color: "#ffffff" } : undefined}
                          >
                            Submit
                          </Button>
                        )}"""

content = content.replace(old_request_button, new_request_button)
content = content.replace(old_osas_button, new_osas_button)

with open("next-app/src/app/student/page.js", "w") as f:
    f.write(content)

print("Done")
