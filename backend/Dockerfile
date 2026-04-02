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

# JVM flags optimized for 256MB container
# Heap: 96MB start, 160MB max
# Thread stacks: 256KB (saves ~15MB vs default 1MB)
# SerialGC: lowest overhead for small heaps
# Metaspace capped at 80MB
ENTRYPOINT ["java", \
  "-Xms96m", \
  "-Xmx160m", \
  "-Xss256k", \
  "-XX:MaxMetaspaceSize=80m", \
  "-XX:+UseSerialGC", \
  "-XX:+UseContainerSupport", \
  "-Djava.security.egd=file:/dev/./urandom", \
  "-jar", "app.jar"]
