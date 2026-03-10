# C++ Makefile for Performance-Critical Storage Modules
# Targets: all, clean, test, benchmark

CXX = g++
CXXFLAGS = -O3 -std=c++17 -Wall -Wextra -pthread -fPIC
INCLUDES = -I./include -I/usr/include/node -I$NODE_INCLUDE_PATH
LIBS = -lssl -lcrypto

SRCS = src/chunk_processor.cpp src/replication_engine.cpp
OBJS = $(SRCS:.cpp=.o)
TARGET = storage_native.node

# Attempt to find Node include path if not provided
ifeq ($(NODE_INCLUDE_PATH),)
	NODE_INCLUDE_PATH = $(shell node -e 'process.stdout.write(require("path").join(process.execPath, "..", "..", "include", "node"))' 2>/dev/null || echo "/usr/include/node")
endif

all: $(TARGET)

$(TARGET): $(OBJS) src/main.o
	$(CXX) $(CXXFLAGS) -shared -o $@ $^ $(LIBS)

%.o: %.cpp
	$(CXX) $(CXXFLAGS) $(INCLUDES) -c $< -o $@

test: tests/test_runner.cpp $(OBJS)
	$(CXX) $(CXXFLAGS) $(INCLUDES) $^ -o test_runner $(LIBS)
	./test_runner

benchmark: benchmarks/benchmark_io.cpp $(OBJS)
	$(CXX) $(CXXFLAGS) $(INCLUDES) $^ -o benchmark_io $(LIBS)
	./benchmark_io

clean:
	rm -f $(OBJS) src/main.o $(TARGET) test_runner benchmark_io

.PHONY: all clean test benchmark
