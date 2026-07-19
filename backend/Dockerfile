# Build stage
FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x mvnw
RUN ./mvnw dependency:go-offline -B
COPY src/ src/
RUN ./mvnw package -DskipTests -B

# Runtime stage — Alpine for smallest image (~80MB vs ~250MB)
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080

# JVM flags optimized for Northflank 256MB container
# Total budget: ~200MB JVM + ~50MB OS/overhead
# Heap: 64MB start, 96MB max
# Metaspace: 80MB (Spring Boot + Hibernate minimum)
# Thread stacks: 256KB (reduced from 512KB)
ENTRYPOINT ["java", \
  "-Xms64m", \
  "-Xmx96m", \
  "-Xss256k", \
  "-XX:MaxMetaspaceSize=80m", \
  "-XX:+UseSerialGC", \
  "-XX:+UseContainerSupport", \
  "-Djava.security.egd=file:/dev/./urandom", \
  "-jar", "app.jar"]
