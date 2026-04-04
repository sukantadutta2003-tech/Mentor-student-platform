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

# JVM flags optimized for Railway 512MB container
# Heap: 128MB start, 256MB max
# Metaspace: 128MB (Spring Boot + Hibernate needs ~100MB)
# Thread stacks: 512KB
ENTRYPOINT ["java", \
  "-Xms128m", \
  "-Xmx256m", \
  "-Xss512k", \
  "-XX:MaxMetaspaceSize=128m", \
  "-XX:+UseSerialGC", \
  "-XX:+UseContainerSupport", \
  "-Djava.security.egd=file:/dev/./urandom", \
  "-jar", "app.jar"]
