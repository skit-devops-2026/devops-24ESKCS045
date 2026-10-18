
pipeline {
    agent any

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install') {
            steps {
                bat 'echo No external dependencies required'
            }
        }

        stage('Test') {
            steps {
                bat 'node tests/test.js'
            }
        }

        stage('Build') {
            steps {
                bat 'if not exist index.html exit /b 1'
                bat 'if not exist style.css exit /b 1'
                bat 'if not exist script.js exit /b 1'
                echo 'Build checks passed'
            }
        }
    }
}
