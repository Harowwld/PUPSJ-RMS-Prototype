import re

with open("src/components/admin/DigitalRecordsReviewTab.js", "r") as f:
    content = f.read()

# Remove the comments that are causing syntax errors
content = content.replace("return (\n                    {/* Stat Card 1: Pending Review */}\n                <Reorder.Item", "return (\n                <Reorder.Item")
content = content.replace("return (\n                    {/* Stat Card 2: Approved Today */}\n                <Reorder.Item", "return (\n                <Reorder.Item")
content = content.replace("return (\n                    {/* Stat Card 3: Returned Today */}\n                <Reorder.Item", "return (\n                <Reorder.Item")

with open("src/components/admin/DigitalRecordsReviewTab.js", "w") as f:
    f.write(content)
