pipeline {
    agent { label 'crowdstarter' }

    options {
        disableConcurrentBuilds()
        timeout(time: 25, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '15', artifactNumToKeepStr: '5'))
        skipDefaultCheckout(true)
        timestamps()
    }

    triggers {
        githubPush()
    }

    stages {
        stage('Obtener codigo') {
            steps {
                deleteDir()
                checkout scm
                sh 'mkdir -p reports'
            }
        }
        stage('Estado pendiente en GitHub') {
            steps {
                withCredentials([string(credentialsId: 'github-commit-status', variable: 'GITHUB_STATUS_TOKEN')]) {
                    withEnv(['CI_RESULT=PENDING']) {
                        sh 'node scripts/github-status.mjs'
                    }
                }
            }
        }
        stage('Validacion temporal de fallo') {
            steps {
                sh 'echo "Fallo controlado para validar GitHub y Discord"; exit 1'
            }
        }
        stage('Instalar dependencias') {
            steps {
                sh 'bun install --frozen-lockfile'
            }
        }
        stage('Pruebas Bun') {
            steps {
                sh 'bun test --reporter=junit --reporter-outfile=reports/bun.xml'
            }
        }
        stage('Build') {
            steps {
                sh 'bun run build'
            }
        }
        stage('Preparar Cypress') {
            steps {
                sh '''
                    bunx --no-install cypress install
                    bunx --no-install cypress verify
                    bunx --no-install cypress version
                '''
            }
        }
        stage('Pruebas E2E') {
            steps {
                sh 'bash scripts/ci-e2e.sh'
            }
        }
    }

    post {
        always {
            junit testResults: 'reports/**/*.xml', allowEmptyResults: true
            archiveArtifacts artifacts: 'reports/**,cypress/screenshots/**,cypress/videos/**',
                allowEmptyArchive: true
        }
        success {
            archiveArtifacts artifacts: 'dist/**', fingerprint: true
        }
        cleanup {
            script {
                // Publicar el resultado del commit exacto obtenido por checkout scm.
                catchError(buildResult: 'UNSTABLE', stageResult: 'UNSTABLE') {
                    withCredentials([string(credentialsId: 'github-commit-status', variable: 'GITHUB_STATUS_TOKEN')]) {
                        withEnv(["CI_RESULT=${currentBuild.currentResult}"]) {
                            sh 'node scripts/github-status.mjs'
                        }
                    }
                }
                // Un fallo de Discord queda visible sin reemplazar el resultado de las pruebas.
                catchError(buildResult: 'UNSTABLE', stageResult: 'UNSTABLE') {
                    withCredentials([string(credentialsId: 'discord-webhook', variable: 'DISCORD_WEBHOOK')]) {
                        withEnv(["CI_RESULT=${currentBuild.currentResult}"]) {
                            sh 'node scripts/notify-discord.mjs'
                        }
                    }
                }
            }
        }
    }
}
