# daysmart-cdk-constructs

## When Adding a New Construct

If a new construct is added, make sure to linting to it.  A quick guide for adding ESLint can be found [here.](https://blog.logrocket.com/linting-typescript-using-eslint-and-prettier/) 

Dependabot then must be updated to have it get access to your package.json and update dependencies.  When adding it to the dependabot script, please keep it in order of where it lies in the constructs.  Simply copy and paste the four lines of code for dependabot, and change the directory to yours.  

To have your construct be built, tested, and published on a push to the master branch, add your construct to the GitHub Action workflow.  With this file, please try to keep the order of the constructs as well.  There are two steps to this as their are two different jobs in the workflow.  
1. Go to the workflow file, and find where your first job will be under the, "get-file-changes".  Copy one of the "- uses" and paste it in the order where your construct is.  Change the 'id' to the name of the construct, but without the "cdk" prefix.  Then the two lines for filtering changes is the full name of your construct.
2. Scroll down to the "Build-Test-and-Publish" job.  Again, find where your construct is in the order.  Copy and paste an "if" statement.  A few changes need to be made to the if statement.  First, after "step." change this to the 'id' you made.  It should be the name of your construct but without the "cdk" prefix.  Then after "outputs." change this to the full name of your construct.  Finally, change the working directory to be the directory of your construct.               
