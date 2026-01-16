import { useState, useEffect, useCallback } from 'react';
import { coursesApi } from '@/services/apiClient';
import { adaptApiCourseToCourse } from '@/services/courseAdapter';
import { Course } from '@/data/mockStore';

export function useCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCourses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const apiCourses = await coursesApi.list();
      const adaptedCourses = apiCourses.map(adaptApiCourseToCourse);
      setCourses(adaptedCourses);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки курсов');
      console.error('Error fetching courses:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  return { courses, loading, error, refetch: fetchCourses };
}

export function useMyCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMyCourses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const apiCourses = await coursesApi.getMyCourses();
      const adaptedCourses = apiCourses.map(adaptApiCourseToCourse);
      setCourses(adaptedCourses);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки моих курсов');
      console.error('Error fetching my courses:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMyCourses();
  }, [fetchMyCourses]);

  return { courses, loading, error, refetch: fetchMyCourses };
}

export function useEnrolledCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEnrolledCourses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const apiCourses = await coursesApi.getEnrolledCourses();
      const adaptedCourses = apiCourses.map(adaptApiCourseToCourse);
      setCourses(adaptedCourses);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки записанных курсов');
      console.error('Error fetching enrolled courses:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEnrolledCourses();
  }, [fetchEnrolledCourses]);

  return { courses, loading, error, refetch: fetchEnrolledCourses };
}

export function useEnrollCourse() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enroll = useCallback(async (courseId: string) => {
    try {
      setLoading(true);
      setError(null);
      await coursesApi.enroll(courseId);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка записи на курс');
      console.error('Error enrolling in course:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return { enroll, loading, error };
}

