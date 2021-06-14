# README

## Introduction
This is the repository for team 3 of Menon Lab's partnership with Ethi for Spotify Mental Health Analysis. Full documentation of our research and approach can be found [here](https://docs.google.com/presentation/d/1qdsqhDewn71UK8f01SKe19toxlxWUn4EqRzBuCLDMEM/edit?usp=sharing). 

## Demo Visualization
The demonstration webpage can be found by opening ``startingPage.html`` in any web browser. The webpage is statically loaded and demonstrates the kind of data that would be available in the final product to the user. Currently, only the first entry in the timeline is populated with a sample session.

## Machine Learning Findings
Full documentation of the team's data analysis can be found in the ``notebooks`` folder. Follow the files in order for a full overview of the process. 

## Machine Learning Demo
A demonstration for the backend information in the webpage can be executed in the ``script`` folder. First, download node.js and add it to path. Then, in the terminal, navigate to the scripts folder. Currently, the ``script/my_data`` folder contains sample data from our team member, Shania Sinha. If you'd like, you can replace the folder with your own data downloaded from Spotify. You can then run the script by running ``node dataAnalysis.js`` in the terminal. The script will output information about each listening session to the terminal. Full documentation of the fields in the session object can be found in ``script/dataAnalysis.js``

