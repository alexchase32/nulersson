<?php
header('Content-Type: application/json');

// Set the directory for storing lesson files
$lessonsDir = 'lessons';

// Create the directory if it doesn't exist
if (!file_exists($lessonsDir)) {
    mkdir($lessonsDir, 0755, true);
}

// Handle different HTTP methods
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        handleGetRequest();
        break;
    case 'POST':
        handlePostRequest();
        break;
    default:
        http_response_code(405); // Method Not Allowed
        echo json_encode(['error' => 'Method not allowed']);
}

// Handle GET requests (list lessons or get a specific lesson)
function handleGetRequest() {
    global $lessonsDir;
    
    // Check if a specific lesson ID is requested
    if (isset($_GET['id'])) {
        $lessonId = $_GET['id'];
        $filePath = "{$lessonsDir}/{$lessonId}.json";
        
        if (file_exists($filePath)) {
            echo file_get_contents($filePath);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Lesson not found']);
        }
    } else {
        // List all available lessons
        $lessons = [];
        $files = glob("{$lessonsDir}/*.json");
        
        foreach ($files as $file) {
            $contents = file_get_contents($file);
            $lesson = json_decode($contents, true);
            $id = basename($file, '.json');
            
            $lessons[] = [
                'id' => $id,
                'name' => $lesson['name'],
                'date' => $lesson['date']
            ];
        }
        
        echo json_encode($lessons);
    }
}

// Handle POST requests (save a lesson)
function handlePostRequest() {
    global $lessonsDir;
    
    // Get the request body
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!$data) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid JSON data']);
        return;
    }
    
    // Check for required fields
    if (!isset($data['name']) || !isset($data['date']) || !isset($data['blocks'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing required fields']);
        return;
    }
    
    // Generate a unique ID if not provided
    if (!isset($data['id'])) {
        $data['id'] = uniqid();
    }
    
    $lessonId = $data['id'];
    $filePath = "{$lessonsDir}/{$lessonId}.json";
    
    // Save the lesson data to a file
    if (file_put_contents($filePath, json_encode($data, JSON_PRETTY_PRINT))) {
        echo json_encode(['id' => $lessonId, 'message' => 'Lesson saved successfully']);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to save lesson']);
    }
}
?>