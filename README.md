# seniorProject
Senior Project - Mental Health App: Model, Frontend, Backend

Anthony Progress 4/19/2026

A lot of changes so here are the notes:

Backend:
- commented out unsued models: extractions and predictions
- Reintroduced endpoints for evaluations/by-month and update preferences & consent in model
- remember to safely migrate and upgrade db
- minor functions in ai_chatbot_service file (not used yet)

Frontend (services):
- Updated apiService functions for functions to reach backend, such as updatePrefernces, updateConsent, and fetchJournalsByMonth (not exact name but search up endpoint)
- If frontend needs data from server, refer to apiService or repository files.
- Changes to sqlite db, using new schema (if old schema persists run function resetDatabase to completely destroy older schema, and run initdb to rebuild)

Frontend (ui and components):
- Introduced useContext for quick access to global user data
- Completely removed use of session and session id, jwt has been integrated in all api calls, along with backend support
- integrated perference selection and sync with local cache user data, selection alters local storage and server db
- Auto skips reimplemented along with the enhanced toggle of preferences
- cancelEvaluation introduced to not save eval if not wanted to

Todo:
- integrate overall changed (diagnostics and update home page & profile page)
- profile page - introduce the consent for saving images (we dont have to save but we need to toggle values)
- The evaluation doesn't read textSkipped if we can fix that. Results screen attempts to show a message if all evaluations are skipped however it doesn't work properly because textSkipped data doesn't pass
- Navigation - currently routes are constantly overlapping and being placed on top of one another, which degrades performance. ensure navigation is handled so there is only one instance of a screen at a time.
- chat bot needs to be tested still to see how it works with current cahnges. unable to do so a this moment due to high request rate.
- Discuss ai usage, because free tier won't be able to handle the amount of uses quick eval + statistic summary + chat bot
- Sign up/register needs to navigate user to home page
- Name isn't saved, if necessary we can update db


If there is anything else or any comments please let me know and i'll try to help :O

4/20

- I merged main to have aidan's latest changes will ensure they work smoothly by eod, today

