// plausibilityCheckService.js

export async function createPlausibilityCheck(
  API_URL,
  name,
  input_file,
  output
) {
  const response = await fetch(`${API_URL}/plausibility/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name, input_file, output }),
  });
  if (!response.ok) {
    throw new Error("Failed to create plausibility check");
  }
  return await response.json();
}

export async function deletePlausibilityCheck(API_URL, check_id) {
  const response = await fetch(`${API_URL}/plausibility/delete`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ check_id }),
  });
  if (!response.ok) {
    throw new Error("Failed to delete plausibility check");
  }
  return await response.json();
}

export async function getPlausibilityChecks(API_URL) {
  const response = await fetch(`${API_URL}/plausibility/get_checks`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    throw new Error("Failed to load plausibility checks");
  }
  return await response.json();
}

export async function getPlausibilityCheckById(API_URL, check_id) {
  const response = await fetch(
    `${API_URL}/plausibility/get_check/${check_id}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
  if (!response.ok) {
    throw new Error("Failed to load plausibility check details");
  }
  return await response.json();
}

export async function startPlausibilityCheck(API_URL, check_id, file) {
  const formData = new FormData();
  formData.append("check_id", check_id);
  formData.append("file", file);

  const response = await fetch(`${API_URL}/plausibility/start`, {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    throw new Error("Failed to start plausibility check and upload PDF");
  }
  return await response.json();
}
